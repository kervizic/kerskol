-- 0058_vivre_ensemble_emc.sql
-- NOUVELLE MATIERE « VIVRE ENSEMBLE » (EMC, enseignement moral et civique,
-- cycle 2, attendus de fin de CE2), a cote de Maths (MA), Francais (FR) et
-- Questionner le monde (QM). Quatre SOUS-MATIERES reglables :
--
--   EMC.RESPECT.*     Respecter les autres et les regles (regles de vie,
--                     politesse, differences + egalite filles-garcons,
--                     refuser la moquerie et le harcelement) ;
--   EMC.EMOTIONS.*    Mes emotions (reconnaitre/nommer, se calmer, empathie) ;
--   EMC.REPUBLIQUE.*  Droits et devoirs, la Republique (droits de l'enfant,
--                     devoirs a l'ecole, symboles, commune et maire, voter) ;
--   EMC.ECRANS.*      Bien utiliser les ecrans (temps d'ecran, proteger ses
--                     infos / demander a un adulte, politesse en ligne, ne pas
--                     tout croire).
--
-- REUTILISATION (ne pas dupliquer la logique) : « Vivre ensemble » partage
-- l'INFRASTRUCTURE « situation » de Questionner le monde (0052) :
--   * meme table de reference public.qm_item (GENERALISEE ici pour accepter les
--     cles EMC.%) ;
--   * meme fonction de verification public.verif_qm (jugement par la cle,
--     agnostique a la matiere) ;
--   * meme op 'qm' dans enregistrer_reponse (branche ELARGIE a EMC.%) ;
--   * meme rendu client <QuestionnerLeMonde> (forme / saisie 'qm').
-- Seuls le CATALOGUE d'exercices (type 'emc', methode 'vivre_ensemble') et le
-- CONTENU changent. Miroir EXACT de frontend/src/domain/emc (test croise
-- emc.test.ts + emc_test.sql). Le SERVEUR reste SEUL JUGE.
--
-- FORMATS : qcm (choix de la bonne conduite), tri (classer), ordre (ranger),
-- texte (reponse libre N4). Ton bienveillant ; harcelement -> toujours « en
-- parler a un adulte de confiance » ; contenus neutres politiquement.
--
-- Migration ADDITIVE et IDEMPOTENTE. La matiere EMC et les 4 sous-matieres sont
-- ajoutees ACTIVES au defaut ET aux profils existants (dont Iris). L'ordre
-- respecte les triggers (0018 matieres, 0039 domaines) : matiere EMC (etape 1)
-- et competences EMC = domaines (etape 5) existent AVANT toute ecriture de
-- profil (etape 10). MA reste active partout -> « au moins une sous-matiere
-- jouable » reste garanti a chaque UPDATE.
--
-- 15 competences x 4 niveaux x 2 = 120 items.

-- =========================================================================
-- 1. Matiere EMC (FK referencee par public.competences.matiere).
-- =========================================================================
INSERT INTO public.matieres (code, libelle) VALUES
    ('EMC', 'Vivre ensemble')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- =========================================================================
-- 2. Type d'exercice 'emc' autorise (ajout au CHECK, idempotent). On reprend la
--    liste courante (0052) + 'emc'.
-- =========================================================================
ALTER TABLE public.exercices DROP CONSTRAINT IF EXISTS exercices_type_chk;
ALTER TABLE public.exercices ADD CONSTRAINT exercices_type_chk CHECK (type IN (
    'calcul','qcm','texte_trous','dictee','geometrie','vocabulaire','conjugaison',
    'grammaire','mots_invariables','donnees','comprehension','mots_maitresse',
    'dictee_maitresse','qm','emc'));

-- =========================================================================
-- 3. Methode pedagogique dediee (reference par exercices.methode).
-- =========================================================================
INSERT INTO public.methodes (code, libelle) VALUES
    ('vivre_ensemble', 'Situations du quotidien (enseignement moral et civique)')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- =========================================================================
-- 4. Table de reference GENERALISEE : public.qm_item accepte desormais QM.% ET
--    EMC.% (meme modele cle/competence/niveau/format/attendu, meme verif_qm).
-- =========================================================================
ALTER TABLE public.qm_item DROP CONSTRAINT IF EXISTS qm_item_comp_chk;
ALTER TABLE public.qm_item ADD CONSTRAINT qm_item_comp_chk
    CHECK (competence LIKE 'QM.%' OR competence LIKE 'EMC.%');
COMMENT ON TABLE public.qm_item IS
    'Items de reference des matieres « situation » (Questionner le monde QM.% et '
    'Vivre ensemble EMC.%), CE2 ; miroir de frontend/src/domain/qm et /emc. Le '
    'serveur y compare la saisie normalisee (verif_qm). Table SERVEUR : aucun GRANT a l''API.';

-- =========================================================================
-- 5. Referentiel : competences EMC (matiere EMC). Ouvertes d'emblee (pas de
--    prerequis bloquant au CE2 ; la sous-matiere s'active par profil).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('EMC.RESPECT.REGLES',         'EMC', 'respect',    'Les règles de la classe',          1100, 4, true),
    ('EMC.RESPECT.POLITESSE',      'EMC', 'respect',    'La politesse',                     1110, 4, true),
    ('EMC.RESPECT.DIFFERENCES',    'EMC', 'respect',    'Respecter les différences',        1120, 4, true),
    ('EMC.RESPECT.MOQUERIE',       'EMC', 'respect',    'Dire non à la moquerie',           1130, 4, true),
    ('EMC.EMOTIONS.RECONNAITRE',   'EMC', 'emotions',   'Reconnaître les émotions',         1140, 4, true),
    ('EMC.EMOTIONS.CALME',         'EMC', 'emotions',   'Se calmer',                        1150, 4, true),
    ('EMC.EMOTIONS.EMPATHIE',      'EMC', 'emotions',   'Se mettre à la place de l''autre', 1160, 4, true),
    ('EMC.REPUBLIQUE.DROITS',      'EMC', 'republique', 'Droits et devoirs',                1170, 4, true),
    ('EMC.REPUBLIQUE.SYMBOLES',    'EMC', 'republique', 'Les symboles de la République',    1180, 4, true),
    ('EMC.REPUBLIQUE.COMMUNE',     'EMC', 'republique', 'La commune et le maire',           1190, 4, true),
    ('EMC.REPUBLIQUE.VOTER',       'EMC', 'republique', 'Voter pour choisir',               1200, 4, true),
    ('EMC.ECRANS.TEMPS',           'EMC', 'ecrans',     'Le temps d''écran',                1210, 4, true),
    ('EMC.ECRANS.DONNEES',         'EMC', 'ecrans',     'Protéger ses informations',        1220, 4, true),
    ('EMC.ECRANS.POLITESSE',       'EMC', 'ecrans',     'Être poli en ligne',               1230, 4, true),
    ('EMC.ECRANS.ESPRITCRITIQUE',  'EMC', 'ecrans',     'Ne pas tout croire',               1240, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- =========================================================================
-- 6. Seed des items (miroir de domain/emc ; test croise front<->SQL). 120 items.
-- =========================================================================
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    -- EMC.RESPECT.REGLES
    ('emc-res-reg-n1-a', 'EMC.RESPECT.REGLES', 1, 'qcm',   'je lève le doigt'),
    ('emc-res-reg-n1-b', 'EMC.RESPECT.REGLES', 1, 'qcm',   'on marche doucement'),
    ('emc-res-reg-n2-a', 'EMC.RESPECT.REGLES', 2, 'qcm',   'lire un livre tranquillement'),
    ('emc-res-reg-n2-b', 'EMC.RESPECT.REGLES', 2, 'tri',   'ranger son matériel=on le fait;écouter la maîtresse=on le fait;se moquer d''un camarade=on ne le fait pas;jeter du papier par terre=on ne le fait pas'),
    ('emc-res-reg-n3-a', 'EMC.RESPECT.REGLES', 3, 'qcm',   'pour que tout le monde se sente bien'),
    ('emc-res-reg-n3-b', 'EMC.RESPECT.REGLES', 3, 'qcm',   'en parler calmement avec la maîtresse'),
    ('emc-res-reg-n4-a', 'EMC.RESPECT.REGLES', 4, 'texte', 'doigt'),
    ('emc-res-reg-n4-b', 'EMC.RESPECT.REGLES', 4, 'texte', 'bien'),
    -- EMC.RESPECT.POLITESSE
    ('emc-res-pol-n1-a', 'EMC.RESPECT.POLITESSE', 1, 'qcm',   'bonjour'),
    ('emc-res-pol-n1-b', 'EMC.RESPECT.POLITESSE', 1, 'qcm',   'merci'),
    ('emc-res-pol-n2-a', 'EMC.RESPECT.POLITESSE', 2, 'qcm',   'Tu me prêtes ta gomme, s''il te plaît ?'),
    ('emc-res-pol-n2-b', 'EMC.RESPECT.POLITESSE', 2, 'tri',   'merci=mot poli;s''il te plaît=mot poli;pardon=mot poli;tais-toi=pas poli'),
    ('emc-res-pol-n3-a', 'EMC.RESPECT.POLITESSE', 3, 'qcm',   'pardon'),
    ('emc-res-pol-n3-b', 'EMC.RESPECT.POLITESSE', 3, 'ordre', 'tu demandes de l''aide, s''il te plaît>on t''aide>tu dis merci'),
    ('emc-res-pol-n4-a', 'EMC.RESPECT.POLITESSE', 4, 'texte', 'merci'),
    ('emc-res-pol-n4-b', 'EMC.RESPECT.POLITESSE', 4, 'texte', 'pardon'),
    -- EMC.RESPECT.DIFFERENCES
    ('emc-res-dif-n1-a', 'EMC.RESPECT.DIFFERENCES', 1, 'qcm',   'je l''aide gentiment'),
    ('emc-res-dif-n1-b', 'EMC.RESPECT.DIFFERENCES', 1, 'qcm',   'pour les filles et les garçons'),
    ('emc-res-dif-n2-a', 'EMC.RESPECT.DIFFERENCES', 2, 'qcm',   'je choisis un jeu qu''on peut faire ensemble'),
    ('emc-res-dif-n2-b', 'EMC.RESPECT.DIFFERENCES', 2, 'tri',   'une fille peut être pompière=vrai;un garçon peut être infirmier=vrai;seuls les garçons peuvent être médecins=faux;seules les filles peuvent cuisiner=faux'),
    ('emc-res-dif-n3-a', 'EMC.RESPECT.DIFFERENCES', 3, 'qcm',   'on peut être amis quand même'),
    ('emc-res-dif-n3-b', 'EMC.RESPECT.DIFFERENCES', 3, 'qcm',   'les filles et les garçons, chacun son tour'),
    ('emc-res-dif-n4-a', 'EMC.RESPECT.DIFFERENCES', 4, 'texte', 'égaux'),
    ('emc-res-dif-n4-b', 'EMC.RESPECT.DIFFERENCES', 4, 'texte', 'respecter'),
    -- EMC.RESPECT.MOQUERIE
    ('emc-res-moq-n1-a', 'EMC.RESPECT.MOQUERIE', 1, 'qcm',   'je ne ris pas et je le console'),
    ('emc-res-moq-n1-b', 'EMC.RESPECT.MOQUERIE', 1, 'qcm',   'à un adulte de confiance'),
    ('emc-res-moq-n2-a', 'EMC.RESPECT.MOQUERIE', 2, 'qcm',   'défendre Sami et prévenir un adulte'),
    ('emc-res-moq-n2-b', 'EMC.RESPECT.MOQUERIE', 2, 'tri',   'tu joues très bien=fait du bien;viens jouer avec nous=fait du bien;tu es nul=fait de la peine;on ne veut pas de toi=fait de la peine'),
    ('emc-res-moq-n3-a', 'EMC.RESPECT.MOQUERIE', 3, 'qcm',   'en parler quand même à un adulte de confiance'),
    ('emc-res-moq-n3-b', 'EMC.RESPECT.MOQUERIE', 3, 'qcm',   'l''inviter à jouer avec toi'),
    ('emc-res-moq-n4-a', 'EMC.RESPECT.MOQUERIE', 4, 'texte', 'adulte'),
    ('emc-res-moq-n4-b', 'EMC.RESPECT.MOQUERIE', 4, 'texte', 'moquer'),
    -- EMC.EMOTIONS.RECONNAITRE
    ('emc-emo-rec-n1-a', 'EMC.EMOTIONS.RECONNAITRE', 1, 'qcm',   'la joie'),
    ('emc-emo-rec-n1-b', 'EMC.EMOTIONS.RECONNAITRE', 1, 'qcm',   'la peur'),
    ('emc-emo-rec-n2-a', 'EMC.EMOTIONS.RECONNAITRE', 2, 'qcm',   'la tristesse'),
    ('emc-emo-rec-n2-b', 'EMC.EMOTIONS.RECONNAITRE', 2, 'tri',   'c''est mon anniversaire=joie;on a cassé mon jouet exprès=colère;je suis seul dans le noir=peur'),
    ('emc-emo-rec-n3-a', 'EMC.EMOTIONS.RECONNAITRE', 3, 'qcm',   'la colère'),
    ('emc-emo-rec-n3-b', 'EMC.EMOTIONS.RECONNAITRE', 3, 'qcm',   'la surprise'),
    ('emc-emo-rec-n4-a', 'EMC.EMOTIONS.RECONNAITRE', 4, 'texte', 'joie'),
    ('emc-emo-rec-n4-b', 'EMC.EMOTIONS.RECONNAITRE', 4, 'texte', 'colère'),
    -- EMC.EMOTIONS.CALME
    ('emc-emo-cal-n1-a', 'EMC.EMOTIONS.CALME', 1, 'qcm',   'respirer doucement'),
    ('emc-emo-cal-n1-b', 'EMC.EMOTIONS.CALME', 1, 'qcm',   'compter jusqu''à 10'),
    ('emc-emo-cal-n2-a', 'EMC.EMOTIONS.CALME', 2, 'qcm',   'je lui dis calmement que ça m''embête'),
    ('emc-emo-cal-n2-b', 'EMC.EMOTIONS.CALME', 2, 'tri',   'respirer lentement=ça calme;demander un câlin=ça calme;tout casser=ça ne calme pas;insulter l''autre=ça ne calme pas'),
    ('emc-emo-cal-n3-a', 'EMC.EMOTIONS.CALME', 3, 'ordre', 'je m''arrête>je respire doucement>je parle calmement'),
    ('emc-emo-cal-n3-b', 'EMC.EMOTIONS.CALME', 3, 'qcm',   'en parler à quelqu''un en qui tu as confiance'),
    ('emc-emo-cal-n4-a', 'EMC.EMOTIONS.CALME', 4, 'texte', 'respirer'),
    ('emc-emo-cal-n4-b', 'EMC.EMOTIONS.CALME', 4, 'texte', 'mots'),
    -- EMC.EMOTIONS.EMPATHIE
    ('emc-emo-emp-n1-a', 'EMC.EMOTIONS.EMPATHIE', 1, 'qcm',   'il a mal et il est triste'),
    ('emc-emo-emp-n1-b', 'EMC.EMOTIONS.EMPATHIE', 1, 'qcm',   'très heureux'),
    ('emc-emo-emp-n2-a', 'EMC.EMOTIONS.EMPATHIE', 2, 'qcm',   'partager mon goûter avec elle'),
    ('emc-emo-emp-n2-b', 'EMC.EMOTIONS.EMPATHIE', 2, 'qcm',   'je m''excuse auprès de lui'),
    ('emc-emo-emp-n3-a', 'EMC.EMOTIONS.EMPATHIE', 3, 'qcm',   'aller lui parler et lui montrer l''école'),
    ('emc-emo-emp-n3-b', 'EMC.EMOTIONS.EMPATHIE', 3, 'qcm',   'imaginer ce qu''il ressent'),
    ('emc-emo-emp-n4-a', 'EMC.EMOTIONS.EMPATHIE', 4, 'texte', 'consoler'),
    ('emc-emo-emp-n4-b', 'EMC.EMOTIONS.EMPATHIE', 4, 'texte', 'place'),
    -- EMC.REPUBLIQUE.DROITS
    ('emc-rep-dro-n1-a', 'EMC.REPUBLIQUE.DROITS', 1, 'qcm',   'l''école'),
    ('emc-rep-dro-n1-b', 'EMC.REPUBLIQUE.DROITS', 1, 'qcm',   'respecter les autres'),
    ('emc-rep-dro-n2-a', 'EMC.REPUBLIQUE.DROITS', 2, 'tri',   'être soigné quand on est malade=un droit;jouer et se reposer=un droit;écouter et faire son travail=un devoir;respecter le matériel=un devoir'),
    ('emc-rep-dro-n2-b', 'EMC.REPUBLIQUE.DROITS', 2, 'qcm',   'être protégé et aller à l''école'),
    ('emc-rep-dro-n3-a', 'EMC.REPUBLIQUE.DROITS', 3, 'qcm',   'faire mon travail et écouter'),
    ('emc-rep-dro-n3-b', 'EMC.REPUBLIQUE.DROITS', 3, 'qcm',   'pour apprendre et grandir ensemble'),
    ('emc-rep-dro-n4-a', 'EMC.REPUBLIQUE.DROITS', 4, 'texte', 'école'),
    ('emc-rep-dro-n4-b', 'EMC.REPUBLIQUE.DROITS', 4, 'texte', 'devoir'),
    -- EMC.REPUBLIQUE.SYMBOLES
    ('emc-rep-sym-n1-a', 'EMC.REPUBLIQUE.SYMBOLES', 1, 'qcm',   'bleu, blanc, rouge'),
    ('emc-rep-sym-n1-b', 'EMC.REPUBLIQUE.SYMBOLES', 1, 'qcm',   'la Marseillaise'),
    ('emc-rep-sym-n2-a', 'EMC.REPUBLIQUE.SYMBOLES', 2, 'qcm',   'Liberté, Égalité, Fraternité'),
    ('emc-rep-sym-n2-b', 'EMC.REPUBLIQUE.SYMBOLES', 2, 'tri',   'le drapeau bleu blanc rouge=symbole de la République;Marianne=symbole de la République;la Marseillaise=symbole de la République;une paire de baskets=pas un symbole'),
    ('emc-rep-sym-n3-a', 'EMC.REPUBLIQUE.SYMBOLES', 3, 'qcm',   'le 14 juillet'),
    ('emc-rep-sym-n3-b', 'EMC.REPUBLIQUE.SYMBOLES', 3, 'qcm',   'la France et ses valeurs'),
    ('emc-rep-sym-n4-a', 'EMC.REPUBLIQUE.SYMBOLES', 4, 'texte', 'Marseillaise'),
    ('emc-rep-sym-n4-b', 'EMC.REPUBLIQUE.SYMBOLES', 4, 'texte', 'Liberté'),
    -- EMC.REPUBLIQUE.COMMUNE
    ('emc-rep-com-n1-a', 'EMC.REPUBLIQUE.COMMUNE', 1, 'qcm',   'le maire'),
    ('emc-rep-com-n1-b', 'EMC.REPUBLIQUE.COMMUNE', 1, 'qcm',   'à la mairie'),
    ('emc-rep-com-n2-a', 'EMC.REPUBLIQUE.COMMUNE', 2, 'qcm',   'un village ou une ville'),
    ('emc-rep-com-n2-b', 'EMC.REPUBLIQUE.COMMUNE', 2, 'tri',   'construire une nouvelle école=le maire s''en occupe;organiser la fête du village=le maire s''en occupe;choisir tes vêtements=pas le maire;faire tes devoirs=pas le maire'),
    ('emc-rep-com-n3-a', 'EMC.REPUBLIQUE.COMMUNE', 3, 'qcm',   's''occuper de l''école, des routes et des fêtes'),
    ('emc-rep-com-n3-b', 'EMC.REPUBLIQUE.COMMUNE', 3, 'qcm',   'on est élu par un vote'),
    ('emc-rep-com-n4-a', 'EMC.REPUBLIQUE.COMMUNE', 4, 'texte', 'maire'),
    ('emc-rep-com-n4-b', 'EMC.REPUBLIQUE.COMMUNE', 4, 'texte', 'mairie'),
    -- EMC.REPUBLIQUE.VOTER
    ('emc-rep-vot-n1-a', 'EMC.REPUBLIQUE.VOTER', 1, 'qcm',   'on vote'),
    ('emc-rep-vot-n1-b', 'EMC.REPUBLIQUE.VOTER', 1, 'qcm',   'une voix chacun'),
    ('emc-rep-vot-n2-a', 'EMC.REPUBLIQUE.VOTER', 2, 'qcm',   'celui qui a le plus de voix'),
    ('emc-rep-vot-n2-b', 'EMC.REPUBLIQUE.VOTER', 2, 'ordre', 'on présente les candidats>chacun vote>on compte les voix'),
    ('emc-rep-vot-n3-a', 'EMC.REPUBLIQUE.VOTER', 3, 'qcm',   'parler au nom des élèves'),
    ('emc-rep-vot-n3-b', 'EMC.REPUBLIQUE.VOTER', 3, 'qcm',   'pour que chacun choisisse librement'),
    ('emc-rep-vot-n4-a', 'EMC.REPUBLIQUE.VOTER', 4, 'texte', 'voter'),
    ('emc-rep-vot-n4-b', 'EMC.REPUBLIQUE.VOTER', 4, 'texte', 'délégué'),
    -- EMC.ECRANS.TEMPS
    ('emc-ecr-tps-n1-a', 'EMC.ECRANS.TEMPS', 1, 'qcm',   'je fais une pause'),
    ('emc-ecr-tps-n1-b', 'EMC.ECRANS.TEMPS', 1, 'qcm',   'éteindre les écrans'),
    ('emc-ecr-tps-n2-a', 'EMC.ECRANS.TEMPS', 2, 'qcm',   'aller jouer dehors'),
    ('emc-ecr-tps-n2-b', 'EMC.ECRANS.TEMPS', 2, 'tri',   'regarder un dessin animé=avec écran;jouer à un jeu vidéo=avec écran;faire du vélo=sans écran;lire un livre=sans écran'),
    ('emc-ecr-tps-n3-a', 'EMC.ECRANS.TEMPS', 3, 'qcm',   'pour bouger, dormir et voir ses amis aussi'),
    ('emc-ecr-tps-n3-b', 'EMC.ECRANS.TEMPS', 3, 'qcm',   'un adulte, un parent'),
    ('emc-ecr-tps-n4-a', 'EMC.ECRANS.TEMPS', 4, 'texte', 'pause'),
    ('emc-ecr-tps-n4-b', 'EMC.ECRANS.TEMPS', 4, 'texte', 'éteindre'),
    -- EMC.ECRANS.DONNEES
    ('emc-ecr-don-n1-a', 'EMC.ECRANS.DONNEES', 1, 'qcm',   'je ne donne pas et je préviens un adulte'),
    ('emc-ecr-don-n1-b', 'EMC.ECRANS.DONNEES', 1, 'qcm',   'non, c''est un secret'),
    ('emc-ecr-don-n2-a', 'EMC.ECRANS.DONNEES', 2, 'tri',   'mon adresse=on garde pour soi;mon mot de passe=on garde pour soi;mon dessin animé préféré=on peut dire;ma couleur préférée=on peut dire'),
    ('emc-ecr-don-n2-b', 'EMC.ECRANS.DONNEES', 2, 'qcm',   'je préviens tout de suite un adulte'),
    ('emc-ecr-don-n3-a', 'EMC.ECRANS.DONNEES', 3, 'qcm',   'pour rester en sécurité'),
    ('emc-ecr-don-n3-b', 'EMC.ECRANS.DONNEES', 3, 'qcm',   'j''en parle à un adulte de confiance'),
    ('emc-ecr-don-n4-a', 'EMC.ECRANS.DONNEES', 4, 'texte', 'adulte'),
    ('emc-ecr-don-n4-b', 'EMC.ECRANS.DONNEES', 4, 'texte', 'secret'),
    -- EMC.ECRANS.POLITESSE
    ('emc-ecr-pol-n1-a', 'EMC.ECRANS.POLITESSE', 1, 'qcm',   'gentiment, comme en vrai'),
    ('emc-ecr-pol-n1-b', 'EMC.ECRANS.POLITESSE', 1, 'qcm',   'ça fait de la peine'),
    ('emc-ecr-pol-n2-a', 'EMC.ECRANS.POLITESSE', 2, 'qcm',   'je reste poli et je préviens un adulte'),
    ('emc-ecr-pol-n2-b', 'EMC.ECRANS.POLITESSE', 2, 'tri',   'bonjour, tu veux jouer avec moi ?=message poli;merci beaucoup pour ton aide=message poli;tu es nul, va-t''en=pas poli;tais-toi espèce de bête=pas poli'),
    ('emc-ecr-pol-n3-a', 'EMC.ECRANS.POLITESSE', 3, 'qcm',   'parce qu''une vraie personne les lit'),
    ('emc-ecr-pol-n3-b', 'EMC.ECRANS.POLITESSE', 3, 'qcm',   'du harcèlement, il faut en parler à un adulte'),
    ('emc-ecr-pol-n4-a', 'EMC.ECRANS.POLITESSE', 4, 'texte', 'personne'),
    ('emc-ecr-pol-n4-b', 'EMC.ECRANS.POLITESSE', 4, 'texte', 'poli'),
    -- EMC.ECRANS.ESPRITCRITIQUE
    ('emc-ecr-cri-n1-a', 'EMC.ECRANS.ESPRITCRITIQUE', 1, 'qcm',   'non, pas toujours'),
    ('emc-ecr-cri-n1-b', 'EMC.ECRANS.ESPRITCRITIQUE', 1, 'qcm',   'je demande à un adulte'),
    ('emc-ecr-cri-n2-a', 'EMC.ECRANS.ESPRITCRITIQUE', 2, 'qcm',   'c''est sûrement truqué'),
    ('emc-ecr-cri-n2-b', 'EMC.ECRANS.ESPRITCRITIQUE', 2, 'tri',   'un chien qui court dans un jardin=possible;un enfant qui mange une glace=possible;une voiture qui vole dans le ciel=sûrement truqué;une personne plus grande qu''un immeuble=sûrement truqué'),
    ('emc-ecr-cri-n3-a', 'EMC.ECRANS.ESPRITCRITIQUE', 3, 'qcm',   'en vérifiant avec un adulte ou un livre sérieux'),
    ('emc-ecr-cri-n3-b', 'EMC.ECRANS.ESPRITCRITIQUE', 3, 'qcm',   'je ne le crois pas et j''en parle à un adulte'),
    ('emc-ecr-cri-n4-a', 'EMC.ECRANS.ESPRITCRITIQUE', 4, 'texte', 'croire'),
    ('emc-ecr-cri-n4-b', 'EMC.ECRANS.ESPRITCRITIQUE', 4, 'texte', 'vérifier')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 7. enregistrer_reponse : branche op = 'qm' ELARGIE a EMC.% (reprend la
--    version 0052 A L'IDENTIQUE, seule la garde de competence du cas 'qm' est
--    etendue a EMC.%). Signature INCHANGEE -> CREATE OR REPLACE (GRANT conserves).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.enregistrer_reponse(
    p_id             uuid,
    p_profil         uuid,
    p_seance         uuid,
    p_competence     text,
    p_exercice       uuid,
    p_niveau         integer,
    p_methode        text,
    p_op             text,
    p_a              integer,
    p_b              integer,
    p_reponse        integer,
    p_reste          integer,
    p_fields         integer,
    p_temps_ms       integer,
    p_correction_lue boolean,
    p_rattrapage     boolean,
    p_placement      boolean,
    p_repondu_le     timestamptz,
    p_op2            text DEFAULT NULL,
    p_c              integer DEFAULT NULL,
    p_mode           text DEFAULT 'seance',
    p_reponse_texte  text DEFAULT NULL,
    p_type_faute     text DEFAULT NULL,
    p_dictee         jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_foyer     uuid;
    v_expected  integer;
    v_reste     integer;
    v_correct   boolean;
    v_existe    boolean;
    v_exist_cor boolean;
    v_n         integer;
    v_niv       integer;
    v_mode      text;
    v_type      text;
    v_dictee    jsonb;
    v_tniv      integer;
    v_liste     public.maitresse_liste%ROWTYPE;
    v_toks      text[];
    v_inj       jsonb;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    v_mode := COALESCE(p_mode, 'seance');
    IF v_mode NOT IN ('seance', 'defi') THEN
        RAISE EXCEPTION 'mode_inconnu';
    END IF;

    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN
        RAISE EXCEPTION 'profil_introuvable';
    END IF;
    IF NOT public.peut_acceder_profil(p_profil) THEN
        RAISE EXCEPTION 'acces_refuse';
    END IF;

    IF v_mode = 'defi' THEN
        SELECT niveau INTO v_niv FROM public.progression
         WHERE profil_id = p_profil AND competence = p_competence;
        IF v_niv IS NULL OR v_niv < 3 THEN
            RAISE EXCEPTION 'defi_non_eligible'
                USING DETAIL = 'le defi ne porte que sur des competences maitrisees (niveau >= 3)';
        END IF;
    END IF;

    SELECT true, correct INTO v_existe, v_exist_cor
      FROM public.reponses WHERE id = p_id;
    IF v_existe THEN
        RETURN jsonb_build_object(
            'ok', true, 'deja', true, 'correct', v_exist_cor,
            'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
    END IF;

    v_type   := NULLIF(btrim(COALESCE(p_type_faute, '')), '');
    v_dictee := NULL;

    IF p_op = 'lettres' THEN
        IF p_competence <> 'MA.NUM.LIRE_ECRIRE' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lettres : competence interdite';
        END IF;
        IF p_a IS NULL OR p_a < 0 OR p_a > 10000 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lettres : nombre hors bornes';
        END IF;
        v_correct := public.verif_lettres(p_a, p_reponse_texte);
        v_expected := p_a;
        v_reste := NULL;
    ELSIF p_op = 'conj' THEN
        IF p_competence NOT LIKE 'FR.CONJ.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : competence interdite';
        END IF;
        IF p_op2 IS NULL OR p_a IS NULL OR p_a < 1 OR p_a > 4
           OR p_b IS NULL OR p_b < 1 OR p_b > 6 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : verbe/temps/personne invalides';
        END IF;
        IF p_a = 4 THEN
            IF p_competence <> 'FR.CONJ.PASSE_COMPOSE' THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : passe compose hors competence';
            END IF;
            IF p_c IS NOT NULL AND p_c NOT IN (0, 1) THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : genre invalide';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM public.conjugaison_pc
                            WHERE verbe = p_op2 AND personne = p_b) THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : forme de reference absente';
            END IF;
            v_correct := public.verif_passe_compose(p_op2, p_b, p_c, p_reponse_texte);
        ELSE
            IF p_competence = 'FR.CONJ.PASSE_COMPOSE' THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : temps simple hors competence';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM public.conjugaison
                            WHERE verbe = p_op2 AND temps = p_a AND personne = p_b) THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : forme de reference absente';
            END IF;
            v_correct := public.verif_conjugaison(p_op2, p_a, p_b, p_reponse_texte);
        END IF;
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'dictee' THEN
        IF p_competence <> 'FR.ORTHO.DETECTIVE' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : competence interdite';
        END IF;
        IF p_a IS NULL OR p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : texte/niveau invalides';
        END IF;
        SELECT niveau INTO v_tniv FROM public.dictee_texte WHERE id = p_a;
        IF v_tniv IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : texte absent';
        END IF;
        IF v_tniv <> p_niveau THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : niveau incoherent';
        END IF;
        v_dictee  := public.verif_dictee(p_a, p_niveau, p_dictee);
        v_correct := (v_dictee->>'juste')::boolean;
        v_type    := v_dictee->>'type_dominant';
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'gram' THEN
        IF p_competence NOT LIKE 'FR.GRAM.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'gram : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'gram : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'gram : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.grammaire_item g
                        WHERE g.cle = p_op2 AND g.competence = p_competence AND g.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'gram : item de reference absent';
        END IF;
        v_correct := public.verif_grammaire(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'lex' THEN
        IF p_competence NOT LIKE 'FR.VOC.%' AND p_competence NOT LIKE 'FR.MOTS.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lex : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lex : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lex : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.lexique_item g
                        WHERE g.cle = p_op2 AND g.competence = p_competence AND g.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lex : item de reference absent';
        END IF;
        v_correct := public.verif_lexique(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'geo' THEN
        IF p_competence NOT LIKE 'MA.GEO.%' AND p_competence NOT LIKE 'MA.REPERE.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'geo : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'geo : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'geo : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.geometrie_item g
                        WHERE g.cle = p_op2 AND g.competence = p_competence AND g.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'geo : item de reference absent';
        END IF;
        v_correct := public.verif_geo(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'don' THEN
        IF p_competence NOT LIKE 'MA.DONNEES.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'don : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'don : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'don : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.donnees_item d
                        WHERE d.cle = p_op2 AND d.competence = p_competence AND d.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'don : item de reference absent';
        END IF;
        v_correct := public.verif_donnees(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'lire' THEN
        IF p_competence NOT LIKE 'FR.LECTURE.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lire : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lire : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lire : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.comprehension_item c
                        WHERE c.cle = p_op2 AND c.competence = p_competence AND c.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lire : item de reference absent';
        END IF;
        v_correct := public.verif_comprehension(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'mmots' THEN
        IF p_competence <> 'FR.MAITRESSE.MOTS' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mmots : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mmots : liste manquante';
        END IF;
        SELECT * INTO v_liste FROM public.maitresse_liste
          WHERE id = p_op2::uuid AND foyer_id = v_foyer AND active = true;
        IF v_liste.id IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mmots : liste absente ou inactive';
        END IF;
        IF p_a IS NULL OR p_a < 1 OR p_a > COALESCE(array_length(v_liste.mots, 1), 0) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mmots : index hors bornes';
        END IF;
        v_correct := public.normaliser_mot(COALESCE(p_reponse_texte, '')) = public.normaliser_mot(v_liste.mots[p_a]);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'mtrou' THEN
        IF p_competence <> 'FR.MAITRESSE.DICTEE' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mtrou : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mtrou : liste manquante';
        END IF;
        SELECT * INTO v_liste FROM public.maitresse_liste
          WHERE id = p_op2::uuid AND foyer_id = v_foyer AND active = true;
        IF v_liste.id IS NULL OR v_liste.texte IS NULL OR btrim(v_liste.texte) = '' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mtrou : liste/texte absent';
        END IF;
        v_toks := regexp_split_to_array(btrim(v_liste.texte), '\s+');
        IF p_a IS NULL OR p_a < 1 OR p_a > COALESCE(array_length(v_toks, 1), 0) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mtrou : index hors bornes';
        END IF;
        v_correct := public.normaliser_mot(COALESCE(p_reponse_texte, '')) = public.normaliser_mot(v_toks[p_a]);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'mdictee' THEN
        IF p_competence <> 'FR.MAITRESSE.DICTEE' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mdictee : competence interdite';
        END IF;
        IF p_op2 IS NULL OR p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mdictee : liste/niveau invalides';
        END IF;
        SELECT * INTO v_liste FROM public.maitresse_liste
          WHERE id = p_op2::uuid AND foyer_id = v_foyer AND active = true;
        IF v_liste.id IS NULL OR v_liste.texte IS NULL OR btrim(v_liste.texte) = '' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mdictee : liste/texte absent';
        END IF;
        v_inj     := public._maitresse_injecter(v_liste.texte, p_niveau);
        v_dictee  := public._verif_dictee_core(p_niveau, v_inj->'erreurs', p_dictee);
        v_correct := (v_dictee->>'juste')::boolean;
        v_type    := v_dictee->>'type_dominant';
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'qm' THEN
        -- Matieres « situation » : Questionner le monde (QM.%) ET Vivre ensemble
        -- (EMC.%). Item de reference dans public.qm_item ; verif_qm compare la
        -- saisie normalisee a `attendu`.
        IF p_competence NOT LIKE 'QM.%' AND p_competence NOT LIKE 'EMC.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'qm : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'qm : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'qm : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.qm_item q
                        WHERE q.cle = p_op2 AND q.competence = p_competence AND q.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'qm : item de reference absent';
        END IF;
        v_correct := public.verif_qm(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSE
        SELECT expected, reste INTO v_expected, v_reste
          FROM public.verif_calcul(p_competence, p_niveau, p_op, p_a, p_b, p_op2, p_c);
        v_correct := (p_reponse = v_expected)
                     AND (COALESCE(p_fields, 1) < 2 OR p_reste = v_reste);
    END IF;

    SELECT count(*) INTO v_n FROM public.reponses
     WHERE profil_id = p_profil AND recu_le >= now() - interval '1 minute';
    IF v_n >= public._plafond('reponses_par_minute') THEN
        RAISE EXCEPTION 'plafond_reponses_minute';
    END IF;

    SELECT count(*) INTO v_n FROM public.reponses
     WHERE profil_id = p_profil AND recu_le >= date_trunc('day', now());
    IF v_n >= public._plafond('reponses_par_jour') THEN
        RAISE EXCEPTION 'plafond_reponses_jour';
    END IF;

    INSERT INTO public.reponses (
        id, profil_id, seance_id, competence, exercice_id, niveau, methode,
        correct, temps_ms, aide_utilisee, correction_lue, rattrapage, placement,
        repondu_le, mode, type_faute)
    VALUES (
        p_id, p_profil, p_seance, p_competence, p_exercice, p_niveau, p_methode,
        v_correct, p_temps_ms, false, COALESCE(p_correction_lue, false),
        COALESCE(p_rattrapage, false), COALESCE(p_placement, false),
        COALESCE(p_repondu_le, now()), v_mode, v_type);

    RETURN jsonb_build_object(
        'ok', true, 'deja', false,
        'correct', v_correct,
        'reponse_attendue', v_expected,
        'reste_attendu', v_reste,
        'dictee', v_dictee,
        'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'ok', true, 'deja', true,
            'correct', (SELECT correct FROM public.reponses WHERE id = p_id),
            'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
END;
$$;

-- =========================================================================
-- 8. Exercices de reference (FK pour reponses.exercice_id + progression).
--    exercice_id deterministe = md5('<competence>:<niveau>:emc'). Type 'emc',
--    methode 'vivre_ensemble'. L'op de verification reste 'qm' (cote client).
-- =========================================================================
DO $do$
DECLARE
    v_comp text;
    v_niv  integer;
    v_id   uuid;
BEGIN
    FOR v_comp IN
        SELECT code FROM public.competences WHERE code LIKE 'EMC.%'
    LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':emc')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'emc', v_niv, 'vivre_ensemble', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 9. Activation : matiere EMC + 4 sous-matieres ACTIVES par defaut (nouveaux
--    profils) ET ajoutees aux profils existants (dont Iris). L'ordre respecte
--    les triggers : la matiere EMC et les domaines respect/emotions/republique/
--    ecrans existent deja (etapes 1 et 5). MA reste active partout -> au moins
--    une sous-matiere jouable garantie a chaque UPDATE.
-- =========================================================================
ALTER TABLE public.profils
    ALTER COLUMN matieres_actives SET DEFAULT '{MA,QM,EMC}'::text[];

UPDATE public.profils
   SET matieres_actives = array_append(matieres_actives, 'EMC')
 WHERE NOT ('EMC' = ANY (matieres_actives));

ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions','geometrie','repere','donnees',
        'grammaire','vocabulaire','mots-invariables','conjugaison','orthographe',
        'lecture','mots-maitresse','vivant','matiere','objets','espace','temps',
        'respect','emotions','republique','ecrans'
    ]::text[];

UPDATE public.profils
   SET domaines_actifs = domaines_actifs
       || (ARRAY(SELECT d FROM unnest(ARRAY['respect','emotions','republique','ecrans']) AS d
                  WHERE NOT (d = ANY (domaines_actifs))))
 WHERE NOT (domaines_actifs @> ARRAY['respect','emotions','republique','ecrans']);

-- =========================================================================
-- 10. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0058_vivre_ensemble_emc')
ON CONFLICT (version) DO NOTHING;
