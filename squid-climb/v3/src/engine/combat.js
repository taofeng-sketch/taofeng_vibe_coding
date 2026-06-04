/* =============================================================================
 * V3 ENGINE — CombatEngine  (M3: MULTI-ENEMY coordinated combat)
 * Framework-agnostic: NO Phaser, NO DOM, NO Sound, NO setTimeout. Pure state +
 * combat math, so it stays headless-testable (plan §11.3). Every state mutation
 * pushes a SEMANTIC fx event onto `this.fx`; the Combat scene drains the queue and
 * turns events into tweens / particles / sounds (juice, plan §1). Card `effect(g)`
 * and enemy `plan(g,e)` / `intent.exec(g)` signatures are unchanged, so the v2
 * data runs verbatim.
 *
 * --- M3 generalization (plan §3) --------------------------------------------
 * v2/M2 had exactly ONE `this.enemy`. M3 redesigns combat around an ENEMY GROUP:
 *   this.enemies = [ {…}, {…}, … ]   // each has its own hp/block/status/intent
 *   this.target  = index             // the player's currently selected enemy
 *   this.enemy   = enemies[target]   // BACK-COMPAT alias = "contextual enemy"
 *
 * `this.enemy` is the *contextual* enemy: it points at the player's target during
 * the player turn (so `g.dealDamage(8)` / `g.enemy.hp` in card data hit the
 * selected foe), and is temporarily re-pointed at the ACTING enemy while that
 * enemy's intent resolves (so `g.enemyAttack(...)` / `g.enemy.block += n` in enemy
 * data act on themselves). This keeps EVERY v2 card/enemy `plan`/`exec` verbatim.
 * A group of one === the old single-enemy game, so M2 encounters still work.
 *
 * Resolution pipeline (plan §3.2 — declare -> telegraph -> player -> resolve):
 *   beginPlayerTurn -> planGroup(this) sets each living enemy's `intent` (the
 *     ENCOUNTER decides coordination); emit "intents" (scene telegraphs them).
 *   player acts; killing an enemy removes its queued intent (defuse the combo).
 *   enemyTurn -> living enemies resolve intents IN SLOT ORDER, so a debuff in
 *     slot 0 modifies an attack in slot 2 *this same turn* (real coordination).
 *
 * Win = ALL enemies dead. Lose = Pulse 0.
 * All positions come from Squid.LAYOUT (no hardcoded x/y in scene logic, §11.7).
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // Default group planner: each living enemy plans independently (no synergy).
  // The single-enemy case and Act II "independent intents" use this.
  function independentPlan(state) {
    state.enemies.forEach(function (e) { if (e.hp > 0 && e.plan) e.intent = e.plan(state, e); });
  }

  /**
   * @param {object} opts {
   *   encounterId?,            // resolve roster + planGroup from Squid.ENCOUNTERS
   *   enemyId?, enemyIds?,     // OR an explicit single id / list of ids
   *   deck:[ids],
   *   player:{pulse,maxPulse,powers}
   * }
   */
  function CombatEngine(opts) {
    opts = opts || {};
    this.CARDS = Squid.CARDS;
    this.ENEMIES = Squid.ENEMIES;
    this.ENCOUNTERS = Squid.ENCOUNTERS;

    var ps = opts.player || {};
    this.player = {
      pulse: ps.pulse != null ? ps.pulse : 80,
      maxPulse: ps.maxPulse != null ? ps.maxPulse : 80,
      hours: 0, hoursPerTurn: 8, focus: 0, block: 0,
      powers: { focusSprint: (ps.powers && ps.powers.focusSprint) || 0 },
      // marked = bruiser bonus flag (PM sets it); denied = your next attack halved (DS sets it)
      status: { weak: 0, burnout: 0, confused: 0, motivated: 0, marked: 0, denied: 0 },
    };

    // ---- resolve the roster (encounter -> ids; else explicit ids) -----------
    var ids, enc = null;
    if (opts.encounterId && this.ENCOUNTERS && this.ENCOUNTERS[opts.encounterId]) {
      enc = this.ENCOUNTERS[opts.encounterId];
      ids = enc.slots.slice();
    } else if (opts.enemyIds) {
      ids = opts.enemyIds.slice();
    } else {
      ids = [opts.enemyId || "bug_swarm"];
    }
    this.encounterId = enc ? enc.id : null;
    this.planGroup = (enc && enc.planGroup) || independentPlan;

    this.enemies = ids.map(function (id, i) {
      var d = Squid.ENEMIES[id];
      if (!d) throw new Error("[CombatEngine] unknown enemyId: " + id);
      return {
        id: d.id, name: d.name, art: d.art, sprite: d.sprite, glyph: d.glyph, tier: d.tier,
        aiRole: d.aiRole, slot: i, idx: i,
        hp: d.maxHp, maxHp: d.maxHp, block: 0, _t: 0, status: { weak: 0 },
        plan: d.plan, intent: null, taunt: d.taunt,
      };
    });
    if (!this.enemies.length) throw new Error("[CombatEngine] empty roster");

    this.target = 0;               // index into this.enemies (first living)
    this.enemy = this.enemies[0];  // BACK-COMPAT contextual-enemy alias

    this.deck = (opts.deck || Squid.STARTER_DECK || []).slice();
    this.drawPile = shuffle(this.deck.slice());
    this.discardPile = [];
    this.exhaustPile = [];
    this.hand = [];
    this.logs = [];
    this.turn = 1;
    this.busy = false;
    this.over = null; // null | "win" | "lose"
    this.fx = [];
  }

  CombatEngine.prototype.emit = function (ev) { this.fx.push(ev); };
  CombatEngine.prototype.drainFx = function () { var f = this.fx; this.fx = []; return f; };

  CombatEngine.prototype.log = function (m) {
    this.logs.push(m);
    if (this.logs.length > 6) this.logs.shift();
    this.emit({ t: "log", msg: m });
  };

  // ---- group helpers --------------------------------------------------------
  CombatEngine.prototype.livingEnemies = function () {
    return this.enemies.filter(function (e) { return e.hp > 0; });
  };
  CombatEngine.prototype.aliveCount = function () { return this.livingEnemies().length; };

  // Select the player's target (clamped to a living enemy). Also syncs the
  // back-compat `this.enemy` alias so single-target card data hits this foe.
  CombatEngine.prototype.setTarget = function (idx) {
    var e = this.enemies[idx];
    if (!e || e.hp <= 0) return false;
    this.target = idx;
    this.enemy = e;
    this.emit({ t: "target", idx: idx });
    return true;
  };

  // Ensure `this.target`/`this.enemy` point at a living enemy (after a kill).
  CombatEngine.prototype.syncTarget = function () {
    var e = this.enemies[this.target];
    if (e && e.hp > 0) { this.enemy = e; return; }
    var live = this.livingEnemies();
    if (live.length) { this.target = live[0].idx; this.enemy = live[0]; this.emit({ t: "target", idx: this.target }); }
  };

  // ---- lifecycle ------------------------------------------------------------
  CombatEngine.prototype.start = function () {
    if (this.enemies.length === 1) {
      this.log(this.enemy.name + " appears. \u201C" + this.enemy.taunt + "\u201D");
    } else {
      this.log("The meeting convenes: " + this.enemies.map(function (e) { return e.name; }).join(", ") + ".");
    }
    this.beginPlayerTurn(true);
  };

  CombatEngine.prototype.beginPlayerTurn = function (first) {
    var p = this.player;
    if (!first && p.status.burnout > 0) {
      this.losePulse(p.status.burnout);
      this.log("Burnout drains " + p.status.burnout + " Pulse.");
    }
    p.block = 0;
    p.hours = p.hoursPerTurn;
    if (p.powers.focusSprint > 0) this.gainFocus(p.powers.focusSprint);
    this.emit({ t: "turnStart", turn: this.turn });
    this.draw(5);
    this.syncTarget();
    // DECLARE phase: the encounter sets every living enemy's intent (coordination
    // lives in planGroup, not the individual). Telegraphed by the scene.
    this.planGroup(this);
    this.emit({ t: "intents" });
    this.busy = false;
  };

  CombatEngine.prototype.endTurn = function () {
    if (this.busy || this.over) return { ok: false };
    this.busy = true;
    var p = this.player;
    var debt = this.hand.filter(function (c) { return c === "tech_debt"; }).length;
    if (debt > 0) {
      this.losePulse(2 * debt);
      this.log("Tech Debt rots in your hand: -" + 2 * debt + " Pulse.");
    }
    var discarded = this.hand.slice();
    this.discardPile = this.discardPile.concat(this.hand);
    this.hand = [];
    this.emit({ t: "discardHand", cards: discarded });
    // player debuffs tick down at end of the player's turn (weak/marked/denied)
    if (p.status.weak > 0) p.status.weak--;
    if (p.status.marked > 0) p.status.marked--;
    if (p.status.denied > 0) p.status.denied--;
    this.checkLose();
    return { ok: true, lost: this.over === "lose" };
  };

  // RESOLVE phase: living enemies resolve their telegraphed intent IN SLOT ORDER.
  // `this.enemy` is temporarily pointed at the acting enemy so its data (which
  // references `g.enemy` / `g.enemyAttack`) operates on itself. Buffs/debuffs in
  // earlier slots therefore modify attacks in later slots THIS SAME TURN (§3.2).
  CombatEngine.prototype.enemyTurn = function () {
    var self = this;
    var order = this.livingEnemies().sort(function (a, b) { return a.slot - b.slot; });
    // reset each living enemy's block at the start of the enemy turn (so block
    // gained last turn persisted through the player's turn, then refreshes)
    order.forEach(function (e) { e.block = 0; });
    for (var i = 0; i < order.length; i++) {
      var e = order[i];
      if (e.hp <= 0) continue; // could have died to an earlier resolve (rare)
      this.enemy = e; // context = acting enemy
      if (e.intent && e.intent.exec) {
        this.emit({ t: "enemyAct", idx: e.idx, kind: e.intent.kind, label: e.intent.label });
        e.intent.exec(this);
      }
      if (e.status.weak > 0) e.status.weak--;
      this.checkLose();
      if (this.over) return { lost: this.over === "lose" };
    }
    this.checkLose();
    if (this.over) return { lost: this.over === "lose" };
    this.turn++;
    this.beginPlayerTurn(false);
    return { lost: false };
  };

  // ---- hand / cards ---------------------------------------------------------
  CombatEngine.prototype.draw = function (n) {
    for (var i = 0; i < n; i++) {
      if (this.hand.length >= 10) break;
      if (this.drawPile.length === 0) {
        if (this.discardPile.length === 0) break;
        this.drawPile = shuffle(this.discardPile);
        this.discardPile = [];
        this.emit({ t: "reshuffle" });
      }
      var id = this.drawPile.pop();
      this.hand.push(id);
      this.emit({ t: "draw", cardId: id, handIndex: this.hand.length - 1 });
    }
  };

  CombatEngine.prototype.canPlay = function (i) {
    if (this.busy || this.over) return false;
    var id = this.hand[i];
    if (id == null) return false;
    var card = this.CARDS[id];
    if (!card || card.unplayable) return false;
    return this.player.hours >= card.cost;
  };

  /**
   * Play hand card `i`. For single-target cards an optional `targetIndex` selects
   * the foe (defaults to the current `this.target`). AoE ("all") and self cards
   * ignore targeting. After resolution the target re-syncs to a living enemy so
   * nothing becomes unplayable when you kill your current target.
   */
  CombatEngine.prototype.playCard = function (i, targetIndex) {
    if (this.busy || this.over) return { ok: false };
    var id = this.hand[i];
    if (id == null) return { ok: false };
    var card = this.CARDS[id];
    if (card.unplayable) {
      this.log(card.name + " is unplayable. That's the joke.");
      return { ok: false, unplayable: true, cardId: id };
    }
    if (this.player.hours < card.cost) {
      this.log("Not enough Working Hours for " + card.name + ".");
      return { ok: false, notEnough: true, cardId: id };
    }
    // route a single-target card at the chosen (living) foe
    var targeting = card.targeting || "single";
    if (targeting === "single" && targetIndex != null) this.setTarget(targetIndex);
    else this.syncTarget();

    this.player.hours -= card.cost;
    this.hand.splice(i, 1);
    var res = { ok: true, cardId: id, card: card, fx: card.fx, targeting: targeting, exhausted: !!card.exhaust, fizzled: false, targetIdx: this.target };
    if (this.player.status.confused > 0) {
      this.player.status.confused--;
      this.log("\u201CNeeds more scope.\u201D " + card.name + " fizzles.");
      this.route(card);
      res.fizzled = true;
      return res;
    }
    this.log("You play " + card.name + ".");
    if (targeting === "all" && card.effectAll) card.effectAll(this);
    else card.effect(this);
    this.route(card);
    this.checkWin();
    if (!this.over) this.syncTarget();
    return res;
  };

  CombatEngine.prototype.route = function (card) {
    if (card.exhaust) this.exhaustPile.push(card.id);
    else this.discardPile.push(card.id);
  };

  // ---- combat math (ported; FX/Sound replaced by emitted events) ------------
  // Player damage. `idx` optional -> defaults to current target. AoE uses
  // dealDamageAll(). DS "denied" halves the next attack the player lands (§3.4).
  CombatEngine.prototype.dealDamage = function (amount, idx) {
    var e = (idx != null && this.enemies[idx] && this.enemies[idx].hp > 0) ? this.enemies[idx] : this.enemy;
    if (!e || e.hp <= 0) { e = this.livingEnemies()[0]; }
    if (!e) return;
    var dmg = amount;
    if (this.player.status.weak > 0) dmg = Math.floor(dmg * 0.75);
    if (this.player.status.motivated > 0) { dmg = Math.floor(dmg * 1.5); this.player.status.motivated--; }
    if (this.player.status.denied > 0) {
      dmg = Math.floor(dmg * 0.5);
      this.player.status.denied--;
      this.log("\u201CNot stat sig.\u201D Your attack is halved.");
      this.emit({ t: "denied" });
    }
    var blocked = 0;
    if (e.block > 0) { var a = Math.min(e.block, dmg); e.block -= a; dmg -= a; blocked = a; }
    var before = e.hp;
    e.hp = Math.max(0, e.hp - dmg);
    this.emit({ t: "damageEnemy", idx: e.idx, amount: dmg, blocked: blocked, hpBefore: before, hpAfter: e.hp });
  };
  // AoE: hit every living enemy (utility for "all"-targeting cards).
  CombatEngine.prototype.dealDamageAll = function (amount) {
    var self = this;
    this.livingEnemies().forEach(function (e) { self.dealDamage(amount, e.idx); });
  };
  CombatEngine.prototype.gainBlock = function (n) { this.player.block += n; this.emit({ t: "gainBlock", amount: n }); };
  CombatEngine.prototype.gainHours = function (n) { this.player.hours += n; this.emit({ t: "gainHours", amount: n }); };
  CombatEngine.prototype.gainFocus = function (n) { this.player.focus += n; this.emit({ t: "gainFocus", amount: n }); };
  CombatEngine.prototype.healPulse = function (n) {
    var b = this.player.pulse;
    this.player.pulse = Math.min(this.player.maxPulse, this.player.pulse + n);
    this.emit({ t: "heal", amount: this.player.pulse - b, before: b, after: this.player.pulse });
  };
  CombatEngine.prototype.losePulse = function (n) {
    var b = this.player.pulse;
    this.player.pulse = Math.max(0, this.player.pulse - n);
    this.emit({ t: "losePulse", amount: b - this.player.pulse, before: b, after: this.player.pulse });
  };
  // Enemy attack: acts AS `this.enemy` (the acting enemy during resolve).
  CombatEngine.prototype.enemyAttack = function (amount, label) {
    var e = this.enemy;
    var dmg = amount;
    if (e.status.weak > 0) dmg = Math.floor(dmg * 0.75);
    var p = this.player, rem = dmg, blocked = 0;
    if (p.block > 0) { var a = Math.min(p.block, rem); p.block -= a; rem -= a; blocked = a; }
    var before = p.pulse;
    if (rem > 0) p.pulse = Math.max(0, p.pulse - rem);
    this.emit({ t: "enemyAttack", idx: e.idx, raw: dmg, taken: rem, blocked: blocked, label: label, before: before, after: p.pulse });
    this.log(e.name + ": " + label + " for " + dmg + (dmg !== rem ? " (" + (dmg - rem) + " blocked)" : "") + ".");
  };
  CombatEngine.prototype.addStatus = function (target, key, amt) {
    var o = target === "player" ? this.player.status : this.enemy.status;
    o[key] = (o[key] || 0) + amt;
    this.emit({ t: "status", who: target, idx: this.enemy.idx, key: key, amt: amt });
  };
  CombatEngine.prototype.shuffleIntoDraw = function (id) {
    this.drawPile.splice(rnd(this.drawPile.length + 1), 0, id);
    this.emit({ t: "shuffleIn", id: id, pile: "draw" });
  };
  CombatEngine.prototype.shuffleIntoDiscard = function (id) {
    this.discardPile.push(id);
    this.emit({ t: "shuffleIn", id: id, pile: "discard" });
  };
  CombatEngine.prototype.enemyDiscardRandom = function () {
    if (!this.hand.length) return;
    var i = rnd(this.hand.length);
    var id = this.hand[i];
    this.discardPile.push(id);
    this.hand.splice(i, 1);
    this.emit({ t: "enemyDiscard", cardId: id, handIndex: i });
  };

  // ---- win / lose -----------------------------------------------------------
  // WIN when ALL enemies are dead (group fight, §3); LOSE at 0 Pulse.
  CombatEngine.prototype.checkWin = function () {
    if (this.aliveCount() === 0 && !this.over) {
      this.over = "win"; this.busy = true;
      var boss = this.enemies.some(function (e) { return e.tier === "boss"; });
      this.emit({ t: "win", boss: boss });
      return true;
    }
    return false;
  };
  CombatEngine.prototype.checkLose = function () {
    if (this.player.pulse <= 0 && !this.over) {
      this.over = "lose"; this.busy = true;
      this.emit({ t: "lose" });
      return true;
    }
    return false;
  };

  CombatEngine.shuffle = shuffle;
  CombatEngine.independentPlan = independentPlan;
  Squid.CombatEngine = CombatEngine;
})();
