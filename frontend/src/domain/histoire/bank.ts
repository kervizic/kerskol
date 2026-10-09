// Banque « HISTOIRE » (CM1, cycle 3 - NOUVEAU PROGRAMME 2026). Nouvelle MATIERE
// (HIST), rendue par <QuestionnerLeMonde> et jugee par le SERVEUR (op 'qm',
// table public.qm_item, verif_qm) comme Questionner le monde, EMC et Sciences.
//
// Programme officiel d'histoire-geographie du cycle 3 (annexe 4), applicable au
// CM1 a la rentree 2026. CINQ sous-matieres (un `domaine` chacune) :
//   HIST.MOYENAGE     Theme 1 : la vie quotidienne au Moyen Age (XIe-XIIIe) ;
//   HIST.MONARCHIE    Theme 2 : la monarchie en France (XVIe-XVIIe) ;
//   HIST.EXPLORATIONS Theme 3 : explorations et conquetes (XVe-XVIIe), traite ;
//   HIST.REVOLUTION   Theme 4 : 1789, une annee revolutionnaire ;
//   HIST.FRISE        la frise chronologique, les siecles (chiffres romains).
//
// DECISION DE MANU : « n'adoucis pas l'Histoire ». Le contenu est FACTUEL, au
// niveau d'un bon manuel de CM1 : guerres de religion (massacre de la
// Saint-Barthelemy nomme), traite et esclavage expliques honnetement (millions
// d'Africains deportes, travail force, Code noir), conquete des Ameriques,
// inegalites de la societe d'ordres, violence de 1789. Sans euphemisme ni
// omission, mais SANS detail gratuit ou macabre.
//
// EXEMPTION BIENVEILLANCE : la regle stricte de bienveillance du projet
// s'applique partout SAUF a cette seule banque histoire, pour laquelle un
// vocabulaire mesure de guerre / mort / esclavage est AUTORISE et TESTE
// (bienveillance.test.ts : estAutorise pour competence HIST.*). Les histoires,
// lectures et enonces restent, eux, sous la regle bienveillance stricte.
//
// Les anciennes sous-matieres (Prehistoire, Gaulois/Romains, Charlemagne, art
// roman/gothique isole) relevaient de l'ANCIEN programme : elles sont
// desactivees cote serveur (migration 0103, actif=false) sans perte de donnees.

import { type QmItem, ordre, tri } from "../qm/types";

export const BANQUE_HISTOIRE: QmItem[] = [
  // ===== HIST.MOYENAGE - Theme 1 : la vie quotidienne au Moyen Age (XIe-XIIIe) =====
  { cle: "hi-moy-n1-a", competence: "HIST.MOYENAGE", niveau: 1, format: "qcm",
    consigne: "Au Moyen Âge, un seigneur possède un grand domaine avec des terres, un château et des paysans. Comment appelle-t-on ce domaine ?",
    options: ["la seigneurie", "la récréation", "la gare"], attendu: "la seigneurie",
    explication: "La seigneurie est le domaine du seigneur. Les paysans y vivent et y travaillent la terre." },
  { cle: "hi-moy-n1-b", competence: "HIST.MOYENAGE", niveau: 1, format: "qcm",
    consigne: "Au Moyen Âge, qui cultive les champs et élève les animaux du seigneur ?",
    options: ["les paysans", "les astronautes", "les pilotes"], attendu: "les paysans",
    explication: "Les paysans sont les plus nombreux. Ils cultivent la terre du seigneur et nourrissent tout le monde." },
  { cle: "hi-moy-n2-a", competence: "HIST.MOYENAGE", niveau: 2, format: "qcm",
    consigne: "Chaque année, les paysans doivent donner une partie de leur récolte à l'Église. Comment appelle-t-on cet impôt ?",
    options: ["la dîme", "le goûter", "le cartable"], attendu: "la dîme",
    explication: "La dîme est l'impôt versé à l'Église : environ une part sur dix de la récolte." },
  { cle: "hi-moy-n2-b", competence: "HIST.MOYENAGE", niveau: 2, format: "tri",
    consigne: "Range chaque bâtiment : lié à l'Église, ou au seigneur ?",
    ...tri(["l'Église", "le seigneur"], [["l'abbaye", "l'Église"], ["la cathédrale", "l'Église"], ["le château fort", "le seigneur"], ["le donjon", "le seigneur"]]),
    explication: "L'abbaye et la cathédrale appartiennent à l'Église ; le château fort et son donjon sont au seigneur." },
  { cle: "hi-moy-n3-a", competence: "HIST.MOYENAGE", niveau: 3, format: "qcm",
    consigne: "En plus de la dîme, les paysans doivent travailler gratuitement quelques jours sur les terres du seigneur. Comment appelle-t-on ce travail obligatoire ?",
    options: ["la corvée", "la sieste", "la colonie"], attendu: "la corvée",
    explication: "La corvée est un travail gratuit dû au seigneur. Les paysans lui devaient aussi des impôts : ils vivaient souvent dans la pauvreté." },
  { cle: "hi-moy-n3-b", competence: "HIST.MOYENAGE", niveau: 3, format: "tri",
    consigne: "Range chaque détail : art roman, ou art gothique ?",
    ...tri(["art roman", "art gothique"], [["des murs épais et de petites fenêtres", "art roman"], ["des arcs ronds (plein cintre)", "art roman"], ["de grandes fenêtres avec des vitraux", "art gothique"], ["des arcs en pointe (ogives)", "art gothique"]]),
    explication: "L'abbaye de Cluny est de style roman (murs épais) ; la cathédrale Notre-Dame de Paris est gothique (vitraux et ogives)." },
  { cle: "hi-moy-n4-a", competence: "HIST.MOYENAGE", niveau: 4, format: "texte",
    consigne: "Le domaine du seigneur, avec ses terres, son château et ses paysans, s'appelle la... Écris le mot.",
    attendu: "seigneurie",
    explication: "La seigneurie : le domaine où le seigneur commande et où les paysans travaillent." },
  { cle: "hi-moy-n4-b", competence: "HIST.MOYENAGE", niveau: 4, format: "texte",
    consigne: "La grande église d'une ville, où se trouve l'évêque, s'appelle une... Écris le mot.",
    attendu: "cathédrale",
    explication: "La cathédrale : la grande église de l'évêque. Notre-Dame de Paris en est une, de style gothique." },

  // ===== HIST.MONARCHIE - Theme 2 : la monarchie en France (XVIe-XVIIe) =====
  { cle: "hi-nar-n1-a", competence: "HIST.MONARCHIE", niveau: 1, format: "qcm",
    consigne: "Quel roi aimait les arts et a fait venir en France le célèbre artiste italien Léonard de Vinci ?",
    options: ["François Ier", "Clovis", "Vercingétorix"], attendu: "François Ier",
    explication: "François Ier (roi de 1515 à 1547) protégeait les artistes. Léonard de Vinci a vécu près de lui, à Amboise." },
  { cle: "hi-nar-n1-b", competence: "HIST.MONARCHIE", niveau: 1, format: "qcm",
    consigne: "Quel roi a fait agrandir le château de Versailles et se faisait appeler le Roi-Soleil ?",
    options: ["Louis XIV", "Charlemagne", "Jules César"], attendu: "Louis XIV",
    explication: "Louis XIV (roi de 1643 à 1715) vivait à Versailles. On l'appelait le Roi-Soleil." },
  { cle: "hi-nar-n2-a", competence: "HIST.MONARCHIE", niveau: 2, format: "qcm",
    consigne: "Au XVIe siècle, catholiques et protestants s'affrontent lors des guerres de religion. Pour ramener la paix, le roi Henri IV signe en 1598 l'...",
    options: ["édit de Nantes", "alphabet", "agenda"], attendu: "édit de Nantes",
    explication: "L'édit de Nantes (1598) autorise les protestants à pratiquer leur religion. Il met fin aux guerres de religion, très violentes, comme le massacre de la Saint-Barthélemy en 1572." },
  { cle: "hi-nar-n2-b", competence: "HIST.MONARCHIE", niveau: 2, format: "tri",
    consigne: "La société était divisée en trois ordres. Range chaque groupe dans le bon ordre.",
    ...tri(["le clergé", "la noblesse", "le tiers état"], [["les prêtres et les évêques", "le clergé"], ["les seigneurs et les grands nobles", "la noblesse"], ["les paysans, les artisans et les bourgeois", "le tiers état"]]),
    explication: "Le clergé et la noblesse avaient des privilèges. Le tiers état, de loin le plus nombreux, payait presque tous les impôts." },
  { cle: "hi-nar-n3-a", competence: "HIST.MONARCHIE", niveau: 3, format: "qcm",
    consigne: "Louis XIV gouverne seul et décide de tout, sans partager son pouvoir. On dit qu'il exerce une monarchie...",
    options: ["absolue", "timide", "partagée"], attendu: "absolue",
    explication: "Dans la monarchie absolue, le roi a tous les pouvoirs. Louis XIV disait vouloir être obéi de tous." },
  { cle: "hi-nar-n3-b", competence: "HIST.MONARCHIE", niveau: 3, format: "ordre",
    consigne: "Range ces trois rois dans l'ordre, du plus ancien au plus récent.",
    ...ordre(["François Ier", "Henri IV", "Louis XIV"]),
    explication: "François Ier (1515), puis Henri IV (1589), puis Louis XIV (1643) : trois rois des Temps modernes." },
  { cle: "hi-nar-n4-a", competence: "HIST.MONARCHIE", niveau: 4, format: "texte",
    consigne: "En 1598, le roi Henri IV signe l'édit de... pour ramener la paix entre catholiques et protestants. Écris le mot.",
    attendu: "Nantes",
    explication: "L'édit de Nantes autorise les protestants à pratiquer leur religion." },
  { cle: "hi-nar-n4-b", competence: "HIST.MONARCHIE", niveau: 4, format: "texte",
    consigne: "Avant la Révolution, le royaume est divisé en trois groupes : le clergé, la noblesse et le tiers état. On dit la société d'... Écris le mot.",
    attendu: "ordres",
    explication: "La société d'ordres : le clergé, la noblesse et le tiers état. C'est surtout le tiers état qui payait les impôts." },

  // ===== HIST.EXPLORATIONS - Theme 3 : explorations et conquetes (XVe-XVIIe) =====
  { cle: "hi-exp-n1-a", competence: "HIST.EXPLORATIONS", niveau: 1, format: "qcm",
    consigne: "Au XVe siècle, les marins partent explorer des routes lointaines sur un nouveau bateau rapide et solide. Comment s'appelle-t-il ?",
    options: ["la caravelle", "la trottinette", "la fusée"], attendu: "la caravelle",
    explication: "La caravelle est un voilier léger. Avec la boussole et de meilleures cartes, les marins osent de longs voyages." },
  { cle: "hi-exp-n1-b", competence: "HIST.EXPLORATIONS", niveau: 1, format: "qcm",
    consigne: "Quel instrument, avec son aiguille aimantée, aide les marins à trouver leur direction en pleine mer ?",
    options: ["la boussole", "la télévision", "le réveil"], attendu: "la boussole",
    explication: "La boussole indique toujours le nord. Elle a permis aux marins de ne plus se perdre." },
  { cle: "hi-exp-n2-a", competence: "HIST.EXPLORATIONS", niveau: 2, format: "qcm",
    consigne: "En 1492, un navigateur traverse l'océan et arrive en Amérique, en croyant atteindre les Indes. Qui est-ce ?",
    options: ["Christophe Colomb", "Léonard de Vinci", "Louis XIV"], attendu: "Christophe Colomb",
    explication: "Christophe Colomb atteint l'Amérique en 1492. Les Européens vont ensuite y fonder de grands empires coloniaux." },
  { cle: "hi-exp-n2-b", competence: "HIST.EXPLORATIONS", niveau: 2, format: "ordre",
    consigne: "Le commerce triangulaire reliait trois continents. Range les trois étapes du trajet des bateaux.",
    ...ordre(["de l'Europe vers l'Afrique", "de l'Afrique vers l'Amérique", "de l'Amérique vers l'Europe"]),
    explication: "Les bateaux partaient d'Europe avec des marchandises, emmenaient de force des Africains vers l'Amérique, puis rapportaient en Europe le sucre et le café des plantations." },
  { cle: "hi-exp-n3-a", competence: "HIST.EXPLORATIONS", niveau: 3, format: "qcm",
    consigne: "Dans leurs colonies d'Amérique, les Européens forcent des millions d'Africains à travailler sans liberté dans les plantations. Comment appelle-t-on ce commerce d'êtres humains ?",
    options: ["la traite des esclaves", "le marché aux fleurs", "la kermesse"], attendu: "la traite des esclaves",
    explication: "La traite a déporté des millions d'Africains, réduits en esclavage et forcés de travailler. C'est l'une des grandes injustices de l'Histoire." },
  { cle: "hi-exp-n3-b", competence: "HIST.EXPLORATIONS", niveau: 3, format: "qcm",
    consigne: "En 1685, un texte du roi organise l'esclavage dans les colonies et traite les esclaves comme des biens que l'on peut acheter ou vendre. Quel est son nom ?",
    options: ["le Code noir", "le livre de recettes", "le carnet de chant"], attendu: "le Code noir",
    explication: "Le Code noir (1685) considérait les esclaves comme des objets, sans liberté ni droits. L'esclavage ne sera aboli que bien plus tard." },
  { cle: "hi-exp-n4-a", competence: "HIST.EXPLORATIONS", niveau: 4, format: "texte",
    consigne: "Le bateau rapide des grands explorateurs du XVe siècle s'appelle la... Écris le mot.",
    attendu: "caravelle",
    explication: "La caravelle : le voilier des explorateurs comme Christophe Colomb." },
  { cle: "hi-exp-n4-b", competence: "HIST.EXPLORATIONS", niveau: 4, format: "texte",
    consigne: "Le navigateur dont l'expédition a réalisé le premier tour du monde (1519-1522) s'appelle... Écris son nom.",
    attendu: "Magellan",
    explication: "Magellan dirigea la première expédition qui fit le tour du monde en bateau." },

  // ===== HIST.REVOLUTION - Theme 4 : 1789, une annee revolutionnaire =====
  { cle: "hi-rev-n1-a", competence: "HIST.REVOLUTION", niveau: 1, format: "qcm",
    consigne: "Le 14 juillet 1789, le peuple de Paris s'empare d'une prison, symbole du pouvoir du roi. Comment s'appelle-t-elle ?",
    options: ["la Bastille", "la récré", "la gare"], attendu: "la Bastille",
    explication: "La prise de la Bastille, le 14 juillet 1789, est un grand moment de la Révolution française. C'est aujourd'hui la fête nationale." },
  { cle: "hi-rev-n1-b", competence: "HIST.REVOLUTION", niveau: 1, format: "qcm",
    consigne: "Au XVIIIe siècle, des savants et des écrivains défendent la liberté et l'égalité. On les appelle les philosophes des...",
    options: ["Lumières", "ténèbres", "vacances"], attendu: "Lumières",
    explication: "Les philosophes des Lumières (comme ceux de l'Encyclopédie) voulaient que les hommes réfléchissent par eux-mêmes." },
  { cle: "hi-rev-n2-a", competence: "HIST.REVOLUTION", niveau: 2, format: "qcm",
    consigne: "Avant 1789, la France est gouvernée par le roi et divisée en trois ordres. Comment appelle-t-on cette époque ?",
    options: ["l'Ancien Régime", "l'heure du goûter", "l'Antiquité"], attendu: "l'Ancien Régime",
    explication: "Sous l'Ancien Régime, le roi décide de tout et le tiers état paie presque tous les impôts : beaucoup trouvent cela injuste." },
  { cle: "hi-rev-n2-b", competence: "HIST.REVOLUTION", niveau: 2, format: "qcm",
    consigne: "En 1789, le roi réunit les États généraux. Les Français écrivent d'abord leurs plaintes et leurs souhaits dans des cahiers de...",
    options: ["doléances", "coloriage", "vacances"], attendu: "doléances",
    explication: "Dans les cahiers de doléances, chacun pouvait dire ce qu'il voulait changer : les impôts, la justice, l'égalité." },
  { cle: "hi-rev-n3-a", competence: "HIST.REVOLUTION", niveau: 3, format: "qcm",
    consigne: "Le 26 août 1789, un texte proclame que les hommes naissent libres et égaux en droits. C'est la Déclaration des droits de l'Homme et du...",
    options: ["citoyen", "dimanche", "cartable"], attendu: "citoyen",
    explication: "La Déclaration des droits de l'Homme et du citoyen affirme la liberté et l'égalité devant la loi. C'est un texte très important encore aujourd'hui." },
  { cle: "hi-rev-n3-b", competence: "HIST.REVOLUTION", niveau: 3, format: "ordre",
    consigne: "Range ces trois événements de l'année 1789 dans l'ordre.",
    ...ordre(["la réunion des États généraux", "la prise de la Bastille", "la Déclaration des droits de l'Homme et du citoyen"]),
    explication: "États généraux (mai), prise de la Bastille (14 juillet), Déclaration des droits (août). En octobre, des femmes marchent sur Versailles pour ramener le roi à Paris." },
  { cle: "hi-rev-n4-a", competence: "HIST.REVOLUTION", niveau: 4, format: "texte",
    consigne: "Le 14 juillet 1789, les Parisiens prennent la... Écris le mot.",
    attendu: "Bastille",
    explication: "La prise de la Bastille : le symbole du début de la Révolution française." },
  { cle: "hi-rev-n4-b", competence: "HIST.REVOLUTION", niveau: 4, format: "texte",
    consigne: "En 1789, la Révolution proclame que les citoyens doivent être libres et avoir les mêmes droits : c'est la liberté et l'... Écris le mot.",
    attendu: "égalité",
    explication: "Liberté et égalité : deux grandes idées de la Révolution, écrites dans la Déclaration des droits de l'Homme et du citoyen." },

  // ===== HIST.FRISE - la frise chronologique, les siecles =====
  { cle: "hi-fri-n1-a", competence: "HIST.FRISE", niveau: 1, format: "qcm",
    consigne: "Pour ranger les événements dans le temps, du plus ancien au plus récent, on dessine une...",
    options: ["frise chronologique", "liste de courses", "carte au trésor"], attendu: "frise chronologique",
    explication: "La frise chronologique est une ligne du temps : elle aide à ranger et à comparer les époques." },
  { cle: "hi-fri-n1-b", competence: "HIST.FRISE", niveau: 1, format: "qcm",
    consigne: "Un siècle, c'est une durée de combien d'années ?",
    options: ["cent ans", "dix ans", "mille ans"], attendu: "cent ans",
    explication: "Un siècle dure cent ans. On compte les siècles en chiffres romains." },
  { cle: "hi-fri-n2-a", competence: "HIST.FRISE", niveau: 2, format: "qcm",
    consigne: "Le Moyen Âge commence en 476 et se termine vers 1492. Quelle grande période vient juste après ?",
    options: ["les Temps modernes", "la Préhistoire", "l'Antiquité"], attendu: "les Temps modernes",
    explication: "Après le Moyen Âge (476-1492) viennent les Temps modernes, l'époque des rois et des grands voyages." },
  { cle: "hi-fri-n2-b", competence: "HIST.FRISE", niveau: 2, format: "ordre",
    consigne: "Range ces trois périodes dans l'ordre du temps.",
    ...ordre(["le Moyen Âge", "les Temps modernes", "l'époque de la Révolution"]),
    explication: "Moyen Âge, puis Temps modernes, puis la Révolution de 1789 : c'est l'ordre des périodes étudiées au CM1." },
  { cle: "hi-fri-n3-a", competence: "HIST.FRISE", niveau: 3, format: "qcm",
    consigne: "L'année 1515 (le roi François Ier) se situe au...",
    options: ["XVIe siècle", "XVe siècle", "XXe siècle"], attendu: "XVIe siècle",
    explication: "Les années 1501 à 1600 forment le XVIe siècle. 1515 est bien au XVIe siècle." },
  { cle: "hi-fri-n3-b", competence: "HIST.FRISE", niveau: 3, format: "qcm",
    consigne: "La Révolution française, en 1789, se situe au...",
    options: ["XVIIIe siècle", "XVIIe siècle", "XIXe siècle"], attendu: "XVIIIe siècle",
    explication: "Les années 1701 à 1800 forment le XVIIIe siècle. 1789 est donc au XVIIIe siècle." },
  { cle: "hi-fri-n4-a", competence: "HIST.FRISE", niveau: 4, format: "texte",
    consigne: "La grande période qui suit le Moyen Âge, après 1492, s'appelle les Temps... Écris le mot.",
    attendu: "modernes",
    explication: "Les Temps modernes : l'époque des rois François Ier, Henri IV et Louis XIV, et des grands voyages." },
  { cle: "hi-fri-n4-b", competence: "HIST.FRISE", niveau: 4, format: "texte",
    consigne: "On écrit les siècles en chiffres romains. Écris le nombre 16 en chiffres romains (comme dans « XVIe siècle », sans le e).",
    attendu: "XVI",
    explication: "16 s'écrit XVI en chiffres romains : X vaut 10, V vaut 5, I vaut 1 (10 + 5 + 1 = 16)." },
];

export const COMPETENCES_HISTOIRE = [
  "HIST.MOYENAGE",
  "HIST.MONARCHIE",
  "HIST.EXPLORATIONS",
  "HIST.REVOLUTION",
  "HIST.FRISE",
] as const;
