/* =============================================================================
 * V3 UI — CardView  (plan §5 — card anatomy / beauty)
 * A card is a Phaser Container composed of layered shapes + text, driven entirely
 * by CARD data (one template, swap art/text per card). Until per-card pixel art
 * exists (M6), the "art window" gray-boxes to the card glyph in its type accent
 * (§10.3). Layers back->front: frame -> art window -> glyph -> name banner ->
 * rules text -> cost orb -> type sigil -> rarity gem.
 *
 * The container exposes helpers the Combat scene uses for juice (§1):
 *   .setPlayable(bool)  dim/undim
 *   .raise()/.lower()   hover lift
 * Pointer wiring (which index to play) is owned by the scene, since hand indices
 * shift as cards are drawn/played.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  // type -> accent color (also tints the frame) per plan §5.2
  var TYPE_ACCENT = {
    attack: 0xff6b5e,  // red/orange
    skill: 0x4fd1c5,   // blue/teal
    power: 0xb083f0,   // purple
    status: 0x8a9a5b,  // sickly grey-green
  };
  var TYPE_SIGIL = { attack: "\u2694", skill: "\u25C8", power: "\u26A1", status: "\u2620" };
  var RARITY_GEM = { common: 0x8a9bad, uncommon: 0xc9a227, rare: 0x4fd1c5 };

  function hex(n) { return "#" + ("000000" + (n >>> 0).toString(16)).slice(-6); }

  /**
   * @param {Phaser.Scene} scene
   * @param {string} cardId
   * @param {object} opts { x, y, w, h }
   * @returns {Phaser.GameObjects.Container} with extra helpers
   */
  function CardView(scene, cardId, opts) {
    opts = opts || {};
    var c = Squid.CARDS[cardId] || { name: cardId, cost: 0, type: "skill", text: "", glyph: "?" };
    var W = opts.w || 150, H = opts.h || 210;
    var accent = TYPE_ACCENT[c.type] != null ? TYPE_ACCENT[c.type] : 0x4fd1c5;
    var con = scene.add.container(opts.x || 0, opts.y || 0);

    var frame = scene.add.rectangle(0, 0, W, H, 0x121b24).setStrokeStyle(3, accent);
    var inner = scene.add.rectangle(0, 0, W - 8, H - 8, 0x0e151d, 0).setStrokeStyle(1, 0x2a3744);

    // art window (gray-box: glyph centered)
    var artY = -H / 2 + 70;
    var artBox = scene.add.rectangle(0, artY, W - 24, 80, 0x05080c).setStrokeStyle(1, accent, 0.5);
    var glyph = scene.add.text(0, artY, c.glyph || "?", {
      fontFamily: "monospace", fontSize: "32px", color: hex(accent), fontStyle: "bold",
    }).setOrigin(0.5);

    // cost orb (top-left)
    var orb = scene.add.circle(-W / 2 + 18, -H / 2 + 18, 15, 0x05080c).setStrokeStyle(2, accent);
    var costT = scene.add.text(-W / 2 + 18, -H / 2 + 18, String(c.cost), {
      fontFamily: "monospace", fontSize: "17px", color: "#ffd479", fontStyle: "bold",
    }).setOrigin(0.5);

    // type sigil (top-right)
    var sigil = scene.add.text(W / 2 - 12, -H / 2 + 9, TYPE_SIGIL[c.type] || "?", {
      fontFamily: "monospace", fontSize: "15px", color: hex(accent),
    }).setOrigin(1, 0);

    // name banner
    var nameY = artY + 60;
    var nameBg = scene.add.rectangle(0, nameY, W - 14, 24, accent, 0.18);
    var name = scene.add.text(0, nameY, c.name, {
      fontFamily: "monospace", fontSize: "12px", color: "#e6f1ff", fontStyle: "bold",
      align: "center", wordWrap: { width: W - 20 },
    }).setOrigin(0.5);

    // rules text box
    var rules = scene.add.text(0, nameY + 42, c.text || "", {
      fontFamily: "monospace", fontSize: "10px", color: "#aebfd2",
      align: "center", wordWrap: { width: W - 26 }, lineSpacing: 2,
    }).setOrigin(0.5);

    // rarity gem (bottom)
    var gemColor = RARITY_GEM[c.rarity] || 0x4a5a6b;
    var gem = scene.add.rectangle(0, H / 2 - 12, 10, 10, gemColor).setAngle(45);

    con.add([frame, inner, artBox, glyph, nameBg, name, rules, orb, costT, sigil, gem]);
    con.setSize(W, H);

    // metadata + helpers
    con.cardId = cardId;
    con.cardData = c;
    con.accent = accent;
    con._frame = frame;
    con._baseY = opts.y || 0;
    con._raised = false;

    con.setPlayable = function (ok) {
      con.setAlpha(ok ? 1 : 0.5);
      frame.setStrokeStyle(3, ok ? accent : 0x3a4754);
      con.playable = ok;
      return con;
    };
    con.setBaseY = function (y) { con._baseY = y; };

    return con;
  }

  CardView.TYPE_ACCENT = TYPE_ACCENT;
  Squid.CardView = CardView;
})();
