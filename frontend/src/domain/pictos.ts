// Picto (emoji) par ETIQUETTE pour les exercices « remettre dans l'ordre ».
// Chaque carte montre une petite image en plus du texte : pour un enfant de 8
// ans qui lit encore lentement, l'image aide a reconnaitre l'etape d'un coup
// d'oeil. Les emoji sont rendus par la police d'emoji du systeme (style « flat »,
// proche de Fluent Emoji deja utilise dans l'appli via public/img/emoji).
//
// Regle : `pictoPourEtiquette` renvoie TOUJOURS un caractere non vide (une image
// generique en dernier recours), pour que CHAQUE etiquette d'un exercice d'ordre
// ait un picto (cf. test ordre-regles : « un picto par etiquette »).

// Normalisation douce (minuscules, sans accents) pour comparer le texte.
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Regles par MOT-CLE contenu dans l'etiquette, de la plus specifique a la plus
// generale (la premiere qui matche gagne). On met les cas composes AVANT les cas
// simples (ex. « sortie de l'oeuf » avant « oeuf »).
const REGLES: Array<[RegExp, string]> = [
  // Cycle de vie / reproduction
  [/sortie de l.?oeuf|eclosion/, "🐣"],
  [/developpement dans l.?oeuf|fecondation/, "🧬"],
  [/oeuf/, "🥚"],
  [/poussin/, "🐥"],
  [/poule/, "🐔"],
  [/tetard a pattes/, "🐸"],
  [/tetard/, "🐟"],
  [/grenouille/, "🐸"],
  [/chenille/, "🐛"],
  [/chrysalide|cocon/, "🟫"],
  [/papillon/, "🦋"],
  [/graine/, "🌰"],
  [/pousse/, "🌱"],
  [/plante/, "🪴"],
  [/fleur/, "🌸"],
  [/fruit|pomme/, "🍎"],
  // Chaines alimentaires
  [/herbe|feuille/, "🌿"],
  [/lapin/, "🐰"],
  [/renard/, "🦊"],
  [/souris/, "🐭"],
  [/serpent/, "🐍"],
  [/aigle/, "🦅"],
  [/oiseau/, "🐦"],
  // Eau / matiere
  [/glace|glacon/, "🧊"],
  [/eau liquide|\beau\b/, "💧"],
  [/vapeur/, "💨"],
  // Moments de la journee / temps
  [/lever du soleil|le matin|\bmatin\b|reveil/, "🌅"],
  [/coucher du soleil|le soir|\bsoir\b/, "🌇"],
  [/\bnuit\b|le coucher|coucher\b|dormir|dort/, "🌙"],
  [/\bmidi\b/, "🌞"],
  [/\becole\b/, "🏫"],
  [/\bhier\b/, "⏮️"],
  [/aujourd.?hui/, "📍"],
  [/\bdemain\b/, "⏭️"],
  // Saisons
  [/printemps/, "🌷"],
  [/\bete\b/, "☀️"],
  [/automne/, "🍂"],
  [/hiver/, "❄️"],
  // Ages de la vie / famille
  [/bebe/, "👶"],
  [/adolescent/, "🧑"],
  [/adulte/, "🧔"],
  [/grand-?pere|grands-?parents/, "👴"],
  [/\bpere\b|parents/, "👨"],
  [/enfant/, "🧒"],
  // Gateau / recette
  [/prepare la pate|\bpate\b/, "🥣"],
  [/cuire|four/, "🔥"],
  [/mange|gateau/, "🍰"],
  // Emotions / se calmer
  [/arrete|arreter/, "✋"],
  [/respire/, "😮‍💨"],
  [/parle|dire|dis\b/, "🗣️"],
  // Politesse / entraide (scene Leo)
  [/demande de l.?aide|aide\b|aides/, "🙋"],
  [/\bmaman\b|aide leo/, "🤝"],
  [/merci/, "🙏"],
  // Election / republique
  [/candidat/, "🗣️"],
  [/vote/, "🗳️"],
  [/compte|voix/, "🔢"],
  // Geo / voyages
  [/ocean|atlantique|pacifique/, "🌊"],
  [/europe|afrique|amerique|continent/, "🗺️"],
  // Histoire : rois, periodes, 1789
  [/francois|henri|louis|\broi\b|monarque/, "👑"],
  [/prehistoire/, "🦴"],
  [/antiquite/, "🏛️"],
  [/moyen age/, "🏰"],
  [/temps modernes/, "⛵"],
  [/revolution|bastille/, "🚩"],
  [/etats generaux|reunion/, "🏛️"],
  [/declaration|droits/, "📜"],
];

const GENERIQUE = "🔖"; // dernier recours : une etiquette a toujours un picto

export function pictoPourEtiquette(label: string): string {
  const n = norm(label);
  for (const [re, emoji] of REGLES) {
    if (re.test(n)) return emoji;
  }
  return GENERIQUE;
}
