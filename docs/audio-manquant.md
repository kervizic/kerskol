# Clips audio manquants (voix Naf)

> Généré automatiquement par le diagnostic du 2026-10-10. Ne pas éditer à la main : relancer `tools/tts/catalogue.py` + diff prod.

- Voix : `naf_D-v1`
- Emplacement cible sur le VPS : `/opt/kerskol/audio/naf_D-v1/<nom_de_fichier>`
- Nom de fichier = `<clip_id>.mp3` où `clip_id = sha1("{voix}\x1f" + texte_nettoyé)[:16]` (cf. `tools/tts/nettoyage.py`).
- Format attendu : mp3, 24 kHz, 64 kbit/s (comme les clips déjà en place).
- Déjà présents en prod : **51** clips. Catalogue complet : **1348** clés / **1348** clips physiques.

## Résumé : **1297 clips à générer**

| Catégorie | À générer |
|---|---:|
| Opérateurs | 8 |
| Nombres | 979 |
| Consignes | 18 |
| Messages | 17 |
| Titres | 15 |
| Indices | 58 |
| Dictées (phrase par phrase) | 202 |
| **Total** | **1297** |

Le texte entre guillemets ci-dessous est le texte À DIRE (déjà nettoyé pour la synthèse).


## Opérateurs (8)

| Clé | Texte à dire | Nom de fichier |
|---|---|---|
| `op:multiplie` | multiplié par | `49f4163025ebba90.mp3` |
| `amorce:combien-font` | Combien font | `6d793d1b8afa9974.mp3` |
| `amorce:combien-de-fois` | Combien de fois | `b0aba7665bac9cf3.mp3` |
| `amorce:le-double-de` | Le double de | `77f06f15fe9607a5.mp3` |
| `amorce:la-moitie-de` | La moitié de | `d95d65e08b97270b.mp3` |
| `amorce:complete` | Complète | `356031918cd9a7b1.mp3` |
| `amorce:ecris-en-lettres` | Écris en lettres le nombre | `627d72bf4c289298.mp3` |
| `amorce:comment-se-lit` | Comment se lit le nombre | `13a164e22408d36b.mp3` |

## Nombres (979)

| Clé | Texte à dire | Nom de fichier |
|---|---|---|
| `num:31` | trente et un | `852b66ffb44de8f9.mp3` |
| `num:32` | trente-deux | `819a574d55ed2dab.mp3` |
| `num:33` | trente-trois | `0425fe07714aa307.mp3` |
| `num:34` | trente-quatre | `44af5fad2f11c613.mp3` |
| `num:35` | trente-cinq | `c471a4c9c147f470.mp3` |
| `num:36` | trente-six | `9a2fc75f37c35d32.mp3` |
| `num:37` | trente-sept | `ebd451421be2b480.mp3` |
| `num:38` | trente-huit | `5ec893ba9aac842a.mp3` |
| `num:39` | trente-neuf | `2909345cbaa3565f.mp3` |
| `num:40` | quarante | `49bf4540a4e555a4.mp3` |
| `num:41` | quarante et un | `19a8d6d59393dfe0.mp3` |
| `num:42` | quarante-deux | `92031dd48caa4fd9.mp3` |
| `num:43` | quarante-trois | `5620db44cc44f66d.mp3` |
| `num:44` | quarante-quatre | `31995e7040f05778.mp3` |
| `num:45` | quarante-cinq | `ec0aef3fd5c82d03.mp3` |
| `num:46` | quarante-six | `94425a0ef578ace9.mp3` |
| `num:47` | quarante-sept | `94ff4b1443dbbc76.mp3` |
| `num:48` | quarante-huit | `b1ef382b3533860e.mp3` |
| `num:49` | quarante-neuf | `6da9bec1f0687408.mp3` |
| `num:50` | cinquante | `7b22cc52668c12b1.mp3` |
| `num:51` | cinquante et un | `1d8dfc9710ae0dd0.mp3` |
| `num:52` | cinquante-deux | `8a79f1e32f8ab13c.mp3` |
| `num:53` | cinquante-trois | `6441dbe9ce97cd5e.mp3` |
| `num:54` | cinquante-quatre | `72d044f556b4139e.mp3` |
| `num:55` | cinquante-cinq | `46a8889c6ea51088.mp3` |
| `num:56` | cinquante-six | `8b83e5466ae8ed6d.mp3` |
| `num:57` | cinquante-sept | `83d47189a183c699.mp3` |
| `num:58` | cinquante-huit | `e29833464dd62a71.mp3` |
| `num:59` | cinquante-neuf | `c4329e27c8bb6e1b.mp3` |
| `num:60` | soixante | `e6c252a160c9a31d.mp3` |
| `num:61` | soixante et un | `f81b17324a65cb82.mp3` |
| `num:62` | soixante-deux | `290175d8d1d4936c.mp3` |
| `num:63` | soixante-trois | `329297485cf4b40b.mp3` |
| `num:64` | soixante-quatre | `e245e76a4cd073c4.mp3` |
| `num:65` | soixante-cinq | `9bcd5b96da0bd5ea.mp3` |
| `num:66` | soixante-six | `90222adc088d65f9.mp3` |
| `num:67` | soixante-sept | `cca9dcf20d60b9c4.mp3` |
| `num:68` | soixante-huit | `d23c17d98542a377.mp3` |
| `num:69` | soixante-neuf | `de8b6377c61971e9.mp3` |
| `num:70` | soixante-dix | `2a7522e258ea3e0d.mp3` |
| `num:71` | soixante et onze | `807d0b2b94be8d95.mp3` |
| `num:72` | soixante-douze | `cd0f706c341f4eaa.mp3` |
| `num:73` | soixante-treize | `db753102b408b620.mp3` |
| `num:74` | soixante-quatorze | `f6c4ea8a269cbc49.mp3` |
| `num:75` | soixante-quinze | `0d69ee40caacf726.mp3` |
| `num:76` | soixante-seize | `a1ac89161e7b8ce2.mp3` |
| `num:77` | soixante-dix-sept | `bec0bcc3dbfaf92c.mp3` |
| `num:78` | soixante-dix-huit | `c3c6d9ece44fd2f3.mp3` |
| `num:79` | soixante-dix-neuf | `f052e2bd4d15d60a.mp3` |
| `num:80` | quatre-vingts | `57bbb370c34da3dc.mp3` |
| `num:81` | quatre-vingt-un | `7f89f7e0fbe5bf85.mp3` |
| `num:82` | quatre-vingt-deux | `0ac5c5fa8cdf37aa.mp3` |
| `num:83` | quatre-vingt-trois | `2e99a8132a3fcbe2.mp3` |
| `num:84` | quatre-vingt-quatre | `3a6dd338de050720.mp3` |
| `num:85` | quatre-vingt-cinq | `b0687bd6342cf61a.mp3` |
| `num:86` | quatre-vingt-six | `85e1c28e2c1775cf.mp3` |
| `num:87` | quatre-vingt-sept | `f932d8a1028f3a2d.mp3` |
| `num:88` | quatre-vingt-huit | `3dbe0e23b8e65e59.mp3` |
| `num:89` | quatre-vingt-neuf | `366262c8f721f02f.mp3` |
| `num:90` | quatre-vingt-dix | `b3a921685afebf54.mp3` |
| `num:91` | quatre-vingt-onze | `83f6e2c3a5719740.mp3` |
| `num:92` | quatre-vingt-douze | `4267d4db741342d3.mp3` |
| `num:93` | quatre-vingt-treize | `ef5569a98d77aa91.mp3` |
| `num:94` | quatre-vingt-quatorze | `b1becae3f23f5b69.mp3` |
| `num:95` | quatre-vingt-quinze | `7581fc05f4858e47.mp3` |
| `num:96` | quatre-vingt-seize | `4bb470bddfc9f999.mp3` |
| `num:97` | quatre-vingt-dix-sept | `4a8da2306d59e818.mp3` |
| `num:98` | quatre-vingt-dix-huit | `bb68a1b61f4d37f8.mp3` |
| `num:99` | quatre-vingt-dix-neuf | `d2d20a121d057e0f.mp3` |
| `num:100` | cent | `9bfc37df08912f25.mp3` |
| `num:101` | cent un | `df244475745f59ac.mp3` |
| `num:102` | cent deux | `779a9c01b99d9425.mp3` |
| `num:103` | cent trois | `fb39365d272f56b3.mp3` |
| `num:104` | cent quatre | `8c52e10e0d22fa2c.mp3` |
| `num:105` | cent cinq | `4f6e1026c6582862.mp3` |
| `num:106` | cent six | `32411a8141a51d31.mp3` |
| `num:107` | cent sept | `0e9771daf6e69d7e.mp3` |
| `num:108` | cent huit | `264febd4c315d4db.mp3` |
| `num:109` | cent neuf | `f9f24d2ca2396057.mp3` |
| `num:110` | cent dix | `d84b9d4b89c61dac.mp3` |
| `num:111` | cent onze | `994b77e8d53b74f3.mp3` |
| `num:112` | cent douze | `45bf70bed03a72e4.mp3` |
| `num:113` | cent treize | `e3237881bf49452c.mp3` |
| `num:114` | cent quatorze | `f0fddf59dfb7e1bf.mp3` |
| `num:115` | cent quinze | `ab2f0209d3b08589.mp3` |
| `num:116` | cent seize | `3cde60f7f360babd.mp3` |
| `num:117` | cent dix-sept | `2af89e85729824af.mp3` |
| `num:118` | cent dix-huit | `bb87f89db74a8657.mp3` |
| `num:119` | cent dix-neuf | `deeb8af1f489642e.mp3` |
| `num:120` | cent vingt | `7995bb1f3dd42897.mp3` |
| `num:121` | cent vingt et un | `aa7162a7d1ff0948.mp3` |
| `num:122` | cent vingt-deux | `4f57f981851aeb17.mp3` |
| `num:123` | cent vingt-trois | `6c49a80ea8ee085f.mp3` |
| `num:124` | cent vingt-quatre | `76a627b029e66fc3.mp3` |
| `num:125` | cent vingt-cinq | `f178dbeb3e0d97de.mp3` |
| `num:126` | cent vingt-six | `9da3bf938b188bb0.mp3` |
| `num:127` | cent vingt-sept | `db9140d5f3f8d905.mp3` |
| `num:128` | cent vingt-huit | `560ad8c6d1790a2e.mp3` |
| `num:129` | cent vingt-neuf | `9a3ac5161d6152ff.mp3` |
| `num:130` | cent trente | `82d7eb0f024f6e9d.mp3` |
| `num:131` | cent trente et un | `1e3c69aa7a22821f.mp3` |
| `num:132` | cent trente-deux | `a3e2526c1677b835.mp3` |
| `num:133` | cent trente-trois | `dd88f7c18a7a1ad8.mp3` |
| `num:134` | cent trente-quatre | `daf5044a5ad9da07.mp3` |
| `num:135` | cent trente-cinq | `db9a28c04dcd1245.mp3` |
| `num:136` | cent trente-six | `3650a21d421ff8d3.mp3` |
| `num:137` | cent trente-sept | `4e944c7215cde632.mp3` |
| `num:138` | cent trente-huit | `f918d93842b37b07.mp3` |
| `num:139` | cent trente-neuf | `2823b85cfba817af.mp3` |
| `num:140` | cent quarante | `d09d0e15115d42e6.mp3` |
| `num:141` | cent quarante et un | `8fc1be9a10fe9a43.mp3` |
| `num:142` | cent quarante-deux | `219b27ce5ee80df4.mp3` |
| `num:143` | cent quarante-trois | `2adc9c616a1c6bea.mp3` |
| `num:144` | cent quarante-quatre | `6463d9283b340bec.mp3` |
| `num:145` | cent quarante-cinq | `31f8ebf78d693d4f.mp3` |
| `num:146` | cent quarante-six | `95d26a8200d14fe7.mp3` |
| `num:147` | cent quarante-sept | `aca7b76d8370f531.mp3` |
| `num:148` | cent quarante-huit | `fc4d7c4eaed3a728.mp3` |
| `num:149` | cent quarante-neuf | `714b8ccee1b1720c.mp3` |
| `num:150` | cent cinquante | `3b37a6520ed94c2c.mp3` |
| `num:151` | cent cinquante et un | `e14ab291d071c347.mp3` |
| `num:152` | cent cinquante-deux | `823c8c2d8d21fc14.mp3` |
| `num:153` | cent cinquante-trois | `44f489b16aab5763.mp3` |
| `num:154` | cent cinquante-quatre | `54e713c5ae6ca359.mp3` |
| `num:155` | cent cinquante-cinq | `7947a999ac09ce74.mp3` |
| `num:156` | cent cinquante-six | `612be42957d831c6.mp3` |
| `num:157` | cent cinquante-sept | `9f89f81faa914ca8.mp3` |
| `num:158` | cent cinquante-huit | `fa2a1d058c4e788b.mp3` |
| `num:159` | cent cinquante-neuf | `8300d45a082ae2d3.mp3` |
| `num:160` | cent soixante | `1efc2bb68cc634f2.mp3` |
| `num:161` | cent soixante et un | `7e0e3cfc83daed32.mp3` |
| `num:162` | cent soixante-deux | `86800fdee7da2dd1.mp3` |
| `num:163` | cent soixante-trois | `81e22b3d04894fe8.mp3` |
| `num:164` | cent soixante-quatre | `d0c625381dd045a9.mp3` |
| `num:165` | cent soixante-cinq | `7014a540f2b08658.mp3` |
| `num:166` | cent soixante-six | `58bd5679a89cf008.mp3` |
| `num:167` | cent soixante-sept | `083d2634eec9b33c.mp3` |
| `num:168` | cent soixante-huit | `d4cf58d908254c3b.mp3` |
| `num:169` | cent soixante-neuf | `55299c70ce69ad6e.mp3` |
| `num:170` | cent soixante-dix | `f5efd02f4c57df60.mp3` |
| `num:171` | cent soixante et onze | `0224bc60f74c7785.mp3` |
| `num:172` | cent soixante-douze | `2b164d43580eb303.mp3` |
| `num:173` | cent soixante-treize | `b5f6739638456f54.mp3` |
| `num:174` | cent soixante-quatorze | `033c09b3ae58e0e2.mp3` |
| `num:175` | cent soixante-quinze | `61fad54009b98a7d.mp3` |
| `num:176` | cent soixante-seize | `190026d461d38afa.mp3` |
| `num:177` | cent soixante-dix-sept | `de95c2f7da340b36.mp3` |
| `num:178` | cent soixante-dix-huit | `a86aca4b196db0b0.mp3` |
| `num:179` | cent soixante-dix-neuf | `7d8c5568c788ff8a.mp3` |
| `num:180` | cent quatre-vingts | `4266d238629ec32e.mp3` |
| `num:181` | cent quatre-vingt-un | `ac43d95fd24351cb.mp3` |
| `num:182` | cent quatre-vingt-deux | `876ad7702f9642ca.mp3` |
| `num:183` | cent quatre-vingt-trois | `3860c729f98e9862.mp3` |
| `num:184` | cent quatre-vingt-quatre | `f15be434cfd8eb09.mp3` |
| `num:185` | cent quatre-vingt-cinq | `1532ae80a60336f1.mp3` |
| `num:186` | cent quatre-vingt-six | `e58fdee44916ecab.mp3` |
| `num:187` | cent quatre-vingt-sept | `2473b9c0c6532fcc.mp3` |
| `num:188` | cent quatre-vingt-huit | `8649fc9069dca0c1.mp3` |
| `num:189` | cent quatre-vingt-neuf | `b265bb5f06dac6da.mp3` |
| `num:190` | cent quatre-vingt-dix | `a107585c317d4de9.mp3` |
| `num:191` | cent quatre-vingt-onze | `23026934d92a222f.mp3` |
| `num:192` | cent quatre-vingt-douze | `81ac9f449b8bc8f7.mp3` |
| `num:193` | cent quatre-vingt-treize | `267cf9a79b0d53d3.mp3` |
| `num:194` | cent quatre-vingt-quatorze | `d7431749e41eb0d7.mp3` |
| `num:195` | cent quatre-vingt-quinze | `51082ca65e74614d.mp3` |
| `num:196` | cent quatre-vingt-seize | `ecd4a3fd5fd69e12.mp3` |
| `num:197` | cent quatre-vingt-dix-sept | `5ae5f753d1a00cc9.mp3` |
| `num:198` | cent quatre-vingt-dix-huit | `17ecba83972f2c17.mp3` |
| `num:199` | cent quatre-vingt-dix-neuf | `c9d90671e1fa6689.mp3` |
| `num:200` | deux cents | `83aa88a3e4cd544e.mp3` |
| `num:201` | deux cent un | `4a97d06860fda936.mp3` |
| `num:202` | deux cent deux | `5c36394727e15381.mp3` |
| `num:203` | deux cent trois | `ff1ce1f340b8761c.mp3` |
| `num:204` | deux cent quatre | `d72e92694fc75a17.mp3` |
| `num:205` | deux cent cinq | `3aa782e4904592fb.mp3` |
| `num:206` | deux cent six | `43a1e0cfb148c848.mp3` |
| `num:207` | deux cent sept | `9cc3cbafd41c86a5.mp3` |
| `num:208` | deux cent huit | `b00ede9880282739.mp3` |
| `num:209` | deux cent neuf | `c576163fc436eb73.mp3` |
| `num:210` | deux cent dix | `ae87a5b49e0a6d5a.mp3` |
| `num:211` | deux cent onze | `d418439b20e5ffbf.mp3` |
| `num:212` | deux cent douze | `02aa0a18cbecde9a.mp3` |
| `num:213` | deux cent treize | `037b4df9bdd787d0.mp3` |
| `num:214` | deux cent quatorze | `f2586ed1ffbf5669.mp3` |
| `num:215` | deux cent quinze | `119f77ae1b5ef156.mp3` |
| `num:216` | deux cent seize | `c51e6530d37a958e.mp3` |
| `num:217` | deux cent dix-sept | `ec5bb6a8c27f9f5d.mp3` |
| `num:218` | deux cent dix-huit | `328b81b2cd364df6.mp3` |
| `num:219` | deux cent dix-neuf | `90f5d79a3c3b2514.mp3` |
| `num:220` | deux cent vingt | `4690dbe0413c9e32.mp3` |
| `num:221` | deux cent vingt et un | `e0e97043f3e17f3f.mp3` |
| `num:222` | deux cent vingt-deux | `15b54608dbf49cc8.mp3` |
| `num:223` | deux cent vingt-trois | `2d887d9b5dc9e98f.mp3` |
| `num:224` | deux cent vingt-quatre | `03e012415306ee09.mp3` |
| `num:225` | deux cent vingt-cinq | `1904a21ec1d93dfb.mp3` |
| `num:226` | deux cent vingt-six | `33349402cf3fca76.mp3` |
| `num:227` | deux cent vingt-sept | `08d3bd3f3f686976.mp3` |
| `num:228` | deux cent vingt-huit | `e4f5b81800adaef0.mp3` |
| `num:229` | deux cent vingt-neuf | `428c97aca06281d8.mp3` |
| `num:230` | deux cent trente | `34903909e6687b0a.mp3` |
| `num:231` | deux cent trente et un | `569cecd6bb91cea2.mp3` |
| `num:232` | deux cent trente-deux | `5dfb51863ce485f7.mp3` |
| `num:233` | deux cent trente-trois | `c15af41f8d85aed5.mp3` |
| `num:234` | deux cent trente-quatre | `58ac35177bac05d1.mp3` |
| `num:235` | deux cent trente-cinq | `6e31c5fdbe4eb296.mp3` |
| `num:236` | deux cent trente-six | `350d8503b08c01aa.mp3` |
| `num:237` | deux cent trente-sept | `11946504d0df64ce.mp3` |
| `num:238` | deux cent trente-huit | `6351ead95da6c8ec.mp3` |
| `num:239` | deux cent trente-neuf | `39032833af30cd0c.mp3` |
| `num:240` | deux cent quarante | `7e1f9af6d513d44a.mp3` |
| `num:241` | deux cent quarante et un | `fe6cc9df704ac342.mp3` |
| `num:242` | deux cent quarante-deux | `a82d710abdaeb0e9.mp3` |
| `num:243` | deux cent quarante-trois | `b452013218cc278f.mp3` |
| `num:244` | deux cent quarante-quatre | `5f877b953c289eca.mp3` |
| `num:245` | deux cent quarante-cinq | `5487f067a370aefe.mp3` |
| `num:246` | deux cent quarante-six | `bb04f2e8d622c7fa.mp3` |
| `num:247` | deux cent quarante-sept | `c7ca95091b4c2ba4.mp3` |
| `num:248` | deux cent quarante-huit | `37dc415503c613b9.mp3` |
| `num:249` | deux cent quarante-neuf | `8d9750740f5daecc.mp3` |
| `num:250` | deux cent cinquante | `fe931fc413aedda3.mp3` |
| `num:251` | deux cent cinquante et un | `e7a45135820be2ce.mp3` |
| `num:252` | deux cent cinquante-deux | `f61337e787e24c75.mp3` |
| `num:253` | deux cent cinquante-trois | `d1baca7f6a908757.mp3` |
| `num:254` | deux cent cinquante-quatre | `5f98ed9ae4b139b8.mp3` |
| `num:255` | deux cent cinquante-cinq | `2b9ce2bd6f848f3f.mp3` |
| `num:256` | deux cent cinquante-six | `8c51042f1c5049ec.mp3` |
| `num:257` | deux cent cinquante-sept | `4251234a608f54ba.mp3` |
| `num:258` | deux cent cinquante-huit | `ee9a86143b818379.mp3` |
| `num:259` | deux cent cinquante-neuf | `8206709b4e1862d8.mp3` |
| `num:260` | deux cent soixante | `f599aa49d0127507.mp3` |
| `num:261` | deux cent soixante et un | `4dad56f439ccd478.mp3` |
| `num:262` | deux cent soixante-deux | `81fc9de9f547c652.mp3` |
| `num:263` | deux cent soixante-trois | `fbe44f9265064f48.mp3` |
| `num:264` | deux cent soixante-quatre | `2f5caab104218211.mp3` |
| `num:265` | deux cent soixante-cinq | `2de19b99ff8aa862.mp3` |
| `num:266` | deux cent soixante-six | `5d83556911d073a7.mp3` |
| `num:267` | deux cent soixante-sept | `d515c5d572ba667b.mp3` |
| `num:268` | deux cent soixante-huit | `a036c9904c2aef4f.mp3` |
| `num:269` | deux cent soixante-neuf | `91861fb8e9004ff6.mp3` |
| `num:270` | deux cent soixante-dix | `f3a237b51aa4ee53.mp3` |
| `num:271` | deux cent soixante et onze | `cafc289397ef32ff.mp3` |
| `num:272` | deux cent soixante-douze | `292877ac70de1f05.mp3` |
| `num:273` | deux cent soixante-treize | `40d5e82b43bcad73.mp3` |
| `num:274` | deux cent soixante-quatorze | `f96fa0c6a20d8540.mp3` |
| `num:275` | deux cent soixante-quinze | `d33791c4af2a9a4a.mp3` |
| `num:276` | deux cent soixante-seize | `71e54428d715e40b.mp3` |
| `num:277` | deux cent soixante-dix-sept | `64ea16696194b474.mp3` |
| `num:278` | deux cent soixante-dix-huit | `012b5ca60abb166a.mp3` |
| `num:279` | deux cent soixante-dix-neuf | `3d5d019d1c22451c.mp3` |
| `num:280` | deux cent quatre-vingts | `45c4f5c92d175f62.mp3` |
| `num:281` | deux cent quatre-vingt-un | `af856600862321a7.mp3` |
| `num:282` | deux cent quatre-vingt-deux | `a7b6352681e3cca7.mp3` |
| `num:283` | deux cent quatre-vingt-trois | `daa339da93aca05f.mp3` |
| `num:284` | deux cent quatre-vingt-quatre | `d4831d43471013c8.mp3` |
| `num:285` | deux cent quatre-vingt-cinq | `7ed0e733d602cc96.mp3` |
| `num:286` | deux cent quatre-vingt-six | `e57304df4a095d4c.mp3` |
| `num:287` | deux cent quatre-vingt-sept | `19be4526c290fa0f.mp3` |
| `num:288` | deux cent quatre-vingt-huit | `9e2eb2dc0c7b013d.mp3` |
| `num:289` | deux cent quatre-vingt-neuf | `159ec42745e46f0a.mp3` |
| `num:290` | deux cent quatre-vingt-dix | `45f22490775bd42c.mp3` |
| `num:291` | deux cent quatre-vingt-onze | `a35dec5ba476c088.mp3` |
| `num:292` | deux cent quatre-vingt-douze | `5f5f24e656aaa2af.mp3` |
| `num:293` | deux cent quatre-vingt-treize | `fe49c07fc8d0a94f.mp3` |
| `num:294` | deux cent quatre-vingt-quatorze | `edf2d5f8d01d33d2.mp3` |
| `num:295` | deux cent quatre-vingt-quinze | `c7bc220acd143053.mp3` |
| `num:296` | deux cent quatre-vingt-seize | `f71acea60be6bc37.mp3` |
| `num:297` | deux cent quatre-vingt-dix-sept | `f3d578d0f646bcff.mp3` |
| `num:298` | deux cent quatre-vingt-dix-huit | `b13fca79483b99a4.mp3` |
| `num:299` | deux cent quatre-vingt-dix-neuf | `f9670402268b1a66.mp3` |
| `num:300` | trois cents | `00ddddd4d65f6355.mp3` |
| `num:301` | trois cent un | `9992ad9151bb8237.mp3` |
| `num:302` | trois cent deux | `e186332aaba12312.mp3` |
| `num:303` | trois cent trois | `758c76cfe06bb378.mp3` |
| `num:304` | trois cent quatre | `91c4931e79ba6ead.mp3` |
| `num:305` | trois cent cinq | `95d577167cdb8a6f.mp3` |
| `num:306` | trois cent six | `2560f2a469a0a797.mp3` |
| `num:307` | trois cent sept | `8c71423ecf55f8da.mp3` |
| `num:308` | trois cent huit | `6f8f00d5c0f167ca.mp3` |
| `num:309` | trois cent neuf | `0ba5003536151c99.mp3` |
| `num:310` | trois cent dix | `a02e16b536415ab5.mp3` |
| `num:311` | trois cent onze | `e3f7cc289bb22b01.mp3` |
| `num:312` | trois cent douze | `bbca839b151f2559.mp3` |
| `num:313` | trois cent treize | `bd377a0456892fe6.mp3` |
| `num:314` | trois cent quatorze | `9de2e37286fac9fa.mp3` |
| `num:315` | trois cent quinze | `ed2cc0d0bde0eb26.mp3` |
| `num:316` | trois cent seize | `a639ea5864d7409f.mp3` |
| `num:317` | trois cent dix-sept | `f909d761bea52aec.mp3` |
| `num:318` | trois cent dix-huit | `47e76431b9748bcf.mp3` |
| `num:319` | trois cent dix-neuf | `427ee81e03e3fc14.mp3` |
| `num:320` | trois cent vingt | `64e7c0fe5ce0ee5e.mp3` |
| `num:321` | trois cent vingt et un | `82257b9dfa16eced.mp3` |
| `num:322` | trois cent vingt-deux | `3f81a6cf34cbb4b6.mp3` |
| `num:323` | trois cent vingt-trois | `640b288f14cc1c92.mp3` |
| `num:324` | trois cent vingt-quatre | `ba23abc3c7582ce8.mp3` |
| `num:325` | trois cent vingt-cinq | `6ca1750ca2e86857.mp3` |
| `num:326` | trois cent vingt-six | `bab94741ab92479e.mp3` |
| `num:327` | trois cent vingt-sept | `e26fc4bf27387543.mp3` |
| `num:328` | trois cent vingt-huit | `d3e0556ff69141af.mp3` |
| `num:329` | trois cent vingt-neuf | `3a5828f94304ef94.mp3` |
| `num:330` | trois cent trente | `3a3c7e844d9a9899.mp3` |
| `num:331` | trois cent trente et un | `96919b7655c50295.mp3` |
| `num:332` | trois cent trente-deux | `8554daf6a64e42f9.mp3` |
| `num:333` | trois cent trente-trois | `3143f3e3552a84fe.mp3` |
| `num:334` | trois cent trente-quatre | `729ff04cb4dabae6.mp3` |
| `num:335` | trois cent trente-cinq | `e61e192280da3fdf.mp3` |
| `num:336` | trois cent trente-six | `db5d378447d048d6.mp3` |
| `num:337` | trois cent trente-sept | `c78d88d826a5521e.mp3` |
| `num:338` | trois cent trente-huit | `91cacd7569191ed7.mp3` |
| `num:339` | trois cent trente-neuf | `c80fc6fbd3de5d19.mp3` |
| `num:340` | trois cent quarante | `bfb8b20057e9e277.mp3` |
| `num:341` | trois cent quarante et un | `f37f3b2c3f03625c.mp3` |
| `num:342` | trois cent quarante-deux | `6d7d9d43f1184832.mp3` |
| `num:343` | trois cent quarante-trois | `1446aa7a37461d7d.mp3` |
| `num:344` | trois cent quarante-quatre | `2c445acef948bd34.mp3` |
| `num:345` | trois cent quarante-cinq | `d502b5234b5b2430.mp3` |
| `num:346` | trois cent quarante-six | `0afb2dd9fb33552c.mp3` |
| `num:347` | trois cent quarante-sept | `20033f8f66b2f3f3.mp3` |
| `num:348` | trois cent quarante-huit | `e861d6414302c51f.mp3` |
| `num:349` | trois cent quarante-neuf | `6ccc1d1c1f1d127f.mp3` |
| `num:350` | trois cent cinquante | `f9eea833c6390e6e.mp3` |
| `num:351` | trois cent cinquante et un | `9ce276b3bd013599.mp3` |
| `num:352` | trois cent cinquante-deux | `f9c893b308608f59.mp3` |
| `num:353` | trois cent cinquante-trois | `5a8bca802ed87e1e.mp3` |
| `num:354` | trois cent cinquante-quatre | `ed503b388945d1a5.mp3` |
| `num:355` | trois cent cinquante-cinq | `3aa5091fd38e73ed.mp3` |
| `num:356` | trois cent cinquante-six | `88d245bf13f84de9.mp3` |
| `num:357` | trois cent cinquante-sept | `3251c58448c320e9.mp3` |
| `num:358` | trois cent cinquante-huit | `2aa7271f2b18fadf.mp3` |
| `num:359` | trois cent cinquante-neuf | `a77fd08cec752df3.mp3` |
| `num:360` | trois cent soixante | `fe839c0f4ee1f1ee.mp3` |
| `num:361` | trois cent soixante et un | `6873536632411e20.mp3` |
| `num:362` | trois cent soixante-deux | `704f7ae308d2cf90.mp3` |
| `num:363` | trois cent soixante-trois | `10bfe4127b0c7c44.mp3` |
| `num:364` | trois cent soixante-quatre | `f616237b89ab6d1e.mp3` |
| `num:365` | trois cent soixante-cinq | `df092e3f7482eb8a.mp3` |
| `num:366` | trois cent soixante-six | `d5019827a2c6aad9.mp3` |
| `num:367` | trois cent soixante-sept | `2b5d77355f96d349.mp3` |
| `num:368` | trois cent soixante-huit | `e02f192dd9f320d6.mp3` |
| `num:369` | trois cent soixante-neuf | `d8225661d790682d.mp3` |
| `num:370` | trois cent soixante-dix | `dd8ef85e3e9a9fd9.mp3` |
| `num:371` | trois cent soixante et onze | `4f8d7845660cc535.mp3` |
| `num:372` | trois cent soixante-douze | `136d367ef90ac1c5.mp3` |
| `num:373` | trois cent soixante-treize | `53ca40c3ee64763f.mp3` |
| `num:374` | trois cent soixante-quatorze | `1b846f5ef9afc6c8.mp3` |
| `num:375` | trois cent soixante-quinze | `531b9c728cbac49b.mp3` |
| `num:376` | trois cent soixante-seize | `0eb0db1cb533f143.mp3` |
| `num:377` | trois cent soixante-dix-sept | `85f59cd21909f994.mp3` |
| `num:378` | trois cent soixante-dix-huit | `ffd4f8c247a59168.mp3` |
| `num:379` | trois cent soixante-dix-neuf | `aa08017af115a7a4.mp3` |
| `num:380` | trois cent quatre-vingts | `d49fcb4bc922a949.mp3` |
| `num:381` | trois cent quatre-vingt-un | `9760965b93f95da9.mp3` |
| `num:382` | trois cent quatre-vingt-deux | `ff8bebf64920bf3f.mp3` |
| `num:383` | trois cent quatre-vingt-trois | `8131815458e0e335.mp3` |
| `num:384` | trois cent quatre-vingt-quatre | `2431bdc2754577ee.mp3` |
| `num:385` | trois cent quatre-vingt-cinq | `a6297247b8abd294.mp3` |
| `num:386` | trois cent quatre-vingt-six | `43f0c1d096accb43.mp3` |
| `num:387` | trois cent quatre-vingt-sept | `4855c0c1ea2588a8.mp3` |
| `num:388` | trois cent quatre-vingt-huit | `fca354e1f411ef2e.mp3` |
| `num:389` | trois cent quatre-vingt-neuf | `746d71b8654431b1.mp3` |
| `num:390` | trois cent quatre-vingt-dix | `d5df14cb5b1dbac8.mp3` |
| `num:391` | trois cent quatre-vingt-onze | `c4b413009a59c14e.mp3` |
| `num:392` | trois cent quatre-vingt-douze | `1f7605eba6cf48b2.mp3` |
| `num:393` | trois cent quatre-vingt-treize | `d8073ad92a3615a1.mp3` |
| `num:394` | trois cent quatre-vingt-quatorze | `ecd365ddf1790947.mp3` |
| `num:395` | trois cent quatre-vingt-quinze | `c51c839b5cf5112f.mp3` |
| `num:396` | trois cent quatre-vingt-seize | `376d3b7468f36aa0.mp3` |
| `num:397` | trois cent quatre-vingt-dix-sept | `b8293c41fbd0b070.mp3` |
| `num:398` | trois cent quatre-vingt-dix-huit | `5bc6efa4f4891c3e.mp3` |
| `num:399` | trois cent quatre-vingt-dix-neuf | `ad393e127c7c98a3.mp3` |
| `num:400` | quatre cents | `787ee518113723ad.mp3` |
| `num:401` | quatre cent un | `a0bf51f800ad1209.mp3` |
| `num:402` | quatre cent deux | `0fe3d3ff7ba882a0.mp3` |
| `num:403` | quatre cent trois | `ce7fad058b24ffaa.mp3` |
| `num:404` | quatre cent quatre | `4a82f2365b0b5a55.mp3` |
| `num:405` | quatre cent cinq | `2986dbda71c876a9.mp3` |
| `num:406` | quatre cent six | `747357e795bed72e.mp3` |
| `num:407` | quatre cent sept | `a8eba9339900aafc.mp3` |
| `num:408` | quatre cent huit | `8263625d096fc8c9.mp3` |
| `num:409` | quatre cent neuf | `6a00b74d2a0ea9ef.mp3` |
| `num:410` | quatre cent dix | `ce6b0116fa133900.mp3` |
| `num:411` | quatre cent onze | `523af4f55e9e914a.mp3` |
| `num:412` | quatre cent douze | `2e9a5213e9008de4.mp3` |
| `num:413` | quatre cent treize | `bed0a1fe31032055.mp3` |
| `num:414` | quatre cent quatorze | `48efa627295d46cd.mp3` |
| `num:415` | quatre cent quinze | `cfc129b31fa213f9.mp3` |
| `num:416` | quatre cent seize | `ed216431c3a59ed9.mp3` |
| `num:417` | quatre cent dix-sept | `ee61fd0bc5eb6d89.mp3` |
| `num:418` | quatre cent dix-huit | `8a76772f80504dc9.mp3` |
| `num:419` | quatre cent dix-neuf | `e85e45af23f86b36.mp3` |
| `num:420` | quatre cent vingt | `0dfa5e8ecd0cdb63.mp3` |
| `num:421` | quatre cent vingt et un | `512e8f574827d303.mp3` |
| `num:422` | quatre cent vingt-deux | `684f0479b9474a57.mp3` |
| `num:423` | quatre cent vingt-trois | `b2794e8751b9e711.mp3` |
| `num:424` | quatre cent vingt-quatre | `8c0428ef8338dadd.mp3` |
| `num:425` | quatre cent vingt-cinq | `ab0eb2f20afb20f1.mp3` |
| `num:426` | quatre cent vingt-six | `3f8ab575767ec3d5.mp3` |
| `num:427` | quatre cent vingt-sept | `aca0b1d1e0914079.mp3` |
| `num:428` | quatre cent vingt-huit | `7316a2ef18e00878.mp3` |
| `num:429` | quatre cent vingt-neuf | `7f094f43070727d2.mp3` |
| `num:430` | quatre cent trente | `e43b8f3f813367f9.mp3` |
| `num:431` | quatre cent trente et un | `9dca3e6544af2e42.mp3` |
| `num:432` | quatre cent trente-deux | `67e8d87f541d6f65.mp3` |
| `num:433` | quatre cent trente-trois | `de725b3406cb0ca5.mp3` |
| `num:434` | quatre cent trente-quatre | `00f1974bf687e57c.mp3` |
| `num:435` | quatre cent trente-cinq | `4844bfde2c557f3e.mp3` |
| `num:436` | quatre cent trente-six | `013637590c8a6e3a.mp3` |
| `num:437` | quatre cent trente-sept | `a8605f32d7afaf53.mp3` |
| `num:438` | quatre cent trente-huit | `06eb0a43947128aa.mp3` |
| `num:439` | quatre cent trente-neuf | `f1a620b2c15ddd38.mp3` |
| `num:440` | quatre cent quarante | `2dc03ef6125d5c2b.mp3` |
| `num:441` | quatre cent quarante et un | `48df1f9c32d2612a.mp3` |
| `num:442` | quatre cent quarante-deux | `8e0445ca78e852a5.mp3` |
| `num:443` | quatre cent quarante-trois | `e293cf240c1b2069.mp3` |
| `num:444` | quatre cent quarante-quatre | `484d3836a2b61d13.mp3` |
| `num:445` | quatre cent quarante-cinq | `9153795a7b3ea27e.mp3` |
| `num:446` | quatre cent quarante-six | `7761d338cffa4035.mp3` |
| `num:447` | quatre cent quarante-sept | `ec5ec79aceadf1e3.mp3` |
| `num:448` | quatre cent quarante-huit | `2026f86ae0ed4848.mp3` |
| `num:449` | quatre cent quarante-neuf | `d0eaa2ef52a250c8.mp3` |
| `num:450` | quatre cent cinquante | `87469f46ebbfd37f.mp3` |
| `num:451` | quatre cent cinquante et un | `aa64abbef5c1274a.mp3` |
| `num:452` | quatre cent cinquante-deux | `d4fe909b8b434bf1.mp3` |
| `num:453` | quatre cent cinquante-trois | `fa20b627095e7d8f.mp3` |
| `num:454` | quatre cent cinquante-quatre | `43051aa277e1e1df.mp3` |
| `num:455` | quatre cent cinquante-cinq | `d1e2532f2b7f33aa.mp3` |
| `num:456` | quatre cent cinquante-six | `5f5a59c27e781614.mp3` |
| `num:457` | quatre cent cinquante-sept | `88dd822ed2b11ccc.mp3` |
| `num:458` | quatre cent cinquante-huit | `f39ef5793fa2375e.mp3` |
| `num:459` | quatre cent cinquante-neuf | `ca2cc46bec7db040.mp3` |
| `num:460` | quatre cent soixante | `7cf86f862171d613.mp3` |
| `num:461` | quatre cent soixante et un | `d854d0598632012c.mp3` |
| `num:462` | quatre cent soixante-deux | `41fbed0953deca75.mp3` |
| `num:463` | quatre cent soixante-trois | `3e9740b556255d7d.mp3` |
| `num:464` | quatre cent soixante-quatre | `f876a70225822649.mp3` |
| `num:465` | quatre cent soixante-cinq | `2f95955812c201b9.mp3` |
| `num:466` | quatre cent soixante-six | `47e9f58ac26b4bfc.mp3` |
| `num:467` | quatre cent soixante-sept | `8b42e91482c33107.mp3` |
| `num:468` | quatre cent soixante-huit | `eb4a47d51f2c0151.mp3` |
| `num:469` | quatre cent soixante-neuf | `827271a4a9dae0de.mp3` |
| `num:470` | quatre cent soixante-dix | `e4e53856944deec7.mp3` |
| `num:471` | quatre cent soixante et onze | `5e0df3b44db4a16b.mp3` |
| `num:472` | quatre cent soixante-douze | `2d92c060427d629f.mp3` |
| `num:473` | quatre cent soixante-treize | `e171edbd2d498732.mp3` |
| `num:474` | quatre cent soixante-quatorze | `8b9513112deea011.mp3` |
| `num:475` | quatre cent soixante-quinze | `7cf4a1964715b346.mp3` |
| `num:476` | quatre cent soixante-seize | `17c2dc5af263b602.mp3` |
| `num:477` | quatre cent soixante-dix-sept | `ddfc5ac463c6f5c0.mp3` |
| `num:478` | quatre cent soixante-dix-huit | `76f8394f44644979.mp3` |
| `num:479` | quatre cent soixante-dix-neuf | `08d57714e0267568.mp3` |
| `num:480` | quatre cent quatre-vingts | `cfcd544f6cc772bf.mp3` |
| `num:481` | quatre cent quatre-vingt-un | `259314d7d0032a22.mp3` |
| `num:482` | quatre cent quatre-vingt-deux | `46c90bcf077860b4.mp3` |
| `num:483` | quatre cent quatre-vingt-trois | `404b20a4f60b8a25.mp3` |
| `num:484` | quatre cent quatre-vingt-quatre | `0b22fc9b706ae668.mp3` |
| `num:485` | quatre cent quatre-vingt-cinq | `79f5af3f457b1115.mp3` |
| `num:486` | quatre cent quatre-vingt-six | `21b69542f496999c.mp3` |
| `num:487` | quatre cent quatre-vingt-sept | `183502deb2a51444.mp3` |
| `num:488` | quatre cent quatre-vingt-huit | `fc8c0ab93aeba0f9.mp3` |
| `num:489` | quatre cent quatre-vingt-neuf | `d10ef89625bb3194.mp3` |
| `num:490` | quatre cent quatre-vingt-dix | `7617eb50e4aa3685.mp3` |
| `num:491` | quatre cent quatre-vingt-onze | `84ed162f290dd430.mp3` |
| `num:492` | quatre cent quatre-vingt-douze | `f3f6527813679c1c.mp3` |
| `num:493` | quatre cent quatre-vingt-treize | `a5ef4f36c9f2c426.mp3` |
| `num:494` | quatre cent quatre-vingt-quatorze | `36b3cc0b1fc05bf7.mp3` |
| `num:495` | quatre cent quatre-vingt-quinze | `aa0eed8472eeadee.mp3` |
| `num:496` | quatre cent quatre-vingt-seize | `d40e89cacace4128.mp3` |
| `num:497` | quatre cent quatre-vingt-dix-sept | `7d9087c64ac28b34.mp3` |
| `num:498` | quatre cent quatre-vingt-dix-huit | `a26f8978d0d5033d.mp3` |
| `num:499` | quatre cent quatre-vingt-dix-neuf | `102212db961602af.mp3` |
| `num:500` | cinq cents | `afdcb10930cd9e59.mp3` |
| `num:501` | cinq cent un | `cfac502abb7ae96b.mp3` |
| `num:502` | cinq cent deux | `8ff8bcb1fe2ac8c7.mp3` |
| `num:503` | cinq cent trois | `0ffb3bd1f13a5306.mp3` |
| `num:504` | cinq cent quatre | `0056daca786bfe17.mp3` |
| `num:505` | cinq cent cinq | `ec2ca8d4b269f93f.mp3` |
| `num:506` | cinq cent six | `10d6563e3fa2963f.mp3` |
| `num:507` | cinq cent sept | `cf2f4821f50965e7.mp3` |
| `num:508` | cinq cent huit | `6487c2fbe887b2f8.mp3` |
| `num:509` | cinq cent neuf | `f0ca32b7147ccbff.mp3` |
| `num:510` | cinq cent dix | `c25a3fc0edea2b3e.mp3` |
| `num:511` | cinq cent onze | `3ec950ade29cc62e.mp3` |
| `num:512` | cinq cent douze | `cf856c7ca42d87f0.mp3` |
| `num:513` | cinq cent treize | `3fa8a99f709d214b.mp3` |
| `num:514` | cinq cent quatorze | `3a4f98f5a736bb8e.mp3` |
| `num:515` | cinq cent quinze | `518417228987cc34.mp3` |
| `num:516` | cinq cent seize | `d969687e2033a222.mp3` |
| `num:517` | cinq cent dix-sept | `bee71e5c28f3c48e.mp3` |
| `num:518` | cinq cent dix-huit | `4ab86b56e14317ef.mp3` |
| `num:519` | cinq cent dix-neuf | `241c1b7d8e2dc9ee.mp3` |
| `num:520` | cinq cent vingt | `61886073032d3151.mp3` |
| `num:521` | cinq cent vingt et un | `7060e81150b0fa9f.mp3` |
| `num:522` | cinq cent vingt-deux | `f096b5a0a2cb6de1.mp3` |
| `num:523` | cinq cent vingt-trois | `72ab86cbffd8846c.mp3` |
| `num:524` | cinq cent vingt-quatre | `5718eef1595bd4d0.mp3` |
| `num:525` | cinq cent vingt-cinq | `0adf455c0c757da4.mp3` |
| `num:526` | cinq cent vingt-six | `addd5ac712acd38d.mp3` |
| `num:527` | cinq cent vingt-sept | `893f204560e77783.mp3` |
| `num:528` | cinq cent vingt-huit | `cbaffb706bad873a.mp3` |
| `num:529` | cinq cent vingt-neuf | `deef734c3f3e417b.mp3` |
| `num:530` | cinq cent trente | `b2823deac0d13405.mp3` |
| `num:531` | cinq cent trente et un | `2dc8e9476bc9fe67.mp3` |
| `num:532` | cinq cent trente-deux | `8750d2658303e903.mp3` |
| `num:533` | cinq cent trente-trois | `a20e2d6a4a253c44.mp3` |
| `num:534` | cinq cent trente-quatre | `9e7fec184a73ac63.mp3` |
| `num:535` | cinq cent trente-cinq | `b524a757ce6c5369.mp3` |
| `num:536` | cinq cent trente-six | `ed1622c4bfbe2d0b.mp3` |
| `num:537` | cinq cent trente-sept | `40ca4088d26c459e.mp3` |
| `num:538` | cinq cent trente-huit | `51c3e27ad1f6112d.mp3` |
| `num:539` | cinq cent trente-neuf | `ff971c5cd874ec41.mp3` |
| `num:540` | cinq cent quarante | `67c65b46dd1105a9.mp3` |
| `num:541` | cinq cent quarante et un | `b110f91d1b3f7207.mp3` |
| `num:542` | cinq cent quarante-deux | `2e6c58620edf1a5a.mp3` |
| `num:543` | cinq cent quarante-trois | `c07e3138ed5f0e33.mp3` |
| `num:544` | cinq cent quarante-quatre | `d40f039991eddb5b.mp3` |
| `num:545` | cinq cent quarante-cinq | `e0f9d47126729c0e.mp3` |
| `num:546` | cinq cent quarante-six | `937ebfb7e234a12a.mp3` |
| `num:547` | cinq cent quarante-sept | `266107967179639a.mp3` |
| `num:548` | cinq cent quarante-huit | `0e322c8b50b49588.mp3` |
| `num:549` | cinq cent quarante-neuf | `9df7ee7ad747669d.mp3` |
| `num:550` | cinq cent cinquante | `54b3296987e8d8ef.mp3` |
| `num:551` | cinq cent cinquante et un | `8622939027dd1350.mp3` |
| `num:552` | cinq cent cinquante-deux | `aedbc54cf4436e92.mp3` |
| `num:553` | cinq cent cinquante-trois | `f118a439f7df0179.mp3` |
| `num:554` | cinq cent cinquante-quatre | `890e7f0bd10466bd.mp3` |
| `num:555` | cinq cent cinquante-cinq | `49fae7e5cd0d494a.mp3` |
| `num:556` | cinq cent cinquante-six | `853cc816a6f5db18.mp3` |
| `num:557` | cinq cent cinquante-sept | `939288fac516c81a.mp3` |
| `num:558` | cinq cent cinquante-huit | `eaebb5d1c119545c.mp3` |
| `num:559` | cinq cent cinquante-neuf | `eff1373c8806e73f.mp3` |
| `num:560` | cinq cent soixante | `172c2e9cd58da669.mp3` |
| `num:561` | cinq cent soixante et un | `b9067fd770513488.mp3` |
| `num:562` | cinq cent soixante-deux | `13517caad36ec6c4.mp3` |
| `num:563` | cinq cent soixante-trois | `ecd60bb3ec65338a.mp3` |
| `num:564` | cinq cent soixante-quatre | `f9c4b9e61a607bd3.mp3` |
| `num:565` | cinq cent soixante-cinq | `0dfa45b1a8c4716f.mp3` |
| `num:566` | cinq cent soixante-six | `19ec1c47806112a8.mp3` |
| `num:567` | cinq cent soixante-sept | `8074be255167af2a.mp3` |
| `num:568` | cinq cent soixante-huit | `60d7957f822fdb63.mp3` |
| `num:569` | cinq cent soixante-neuf | `35d954ed53c51a3c.mp3` |
| `num:570` | cinq cent soixante-dix | `b3b7af400cfe77a7.mp3` |
| `num:571` | cinq cent soixante et onze | `a307bd2279f5c1f9.mp3` |
| `num:572` | cinq cent soixante-douze | `0fa6f259e68a7fb3.mp3` |
| `num:573` | cinq cent soixante-treize | `1d15c8580691a088.mp3` |
| `num:574` | cinq cent soixante-quatorze | `1ec533e8df37f40f.mp3` |
| `num:575` | cinq cent soixante-quinze | `b41905c80ab4e118.mp3` |
| `num:576` | cinq cent soixante-seize | `330532200ccbdac7.mp3` |
| `num:577` | cinq cent soixante-dix-sept | `e39f8f2fe6c2da84.mp3` |
| `num:578` | cinq cent soixante-dix-huit | `0a5d2014999f60a6.mp3` |
| `num:579` | cinq cent soixante-dix-neuf | `615986bf20f3032e.mp3` |
| `num:580` | cinq cent quatre-vingts | `60a69add8bd6414b.mp3` |
| `num:581` | cinq cent quatre-vingt-un | `f00cf64094441d26.mp3` |
| `num:582` | cinq cent quatre-vingt-deux | `d8492c12bd72f6a6.mp3` |
| `num:583` | cinq cent quatre-vingt-trois | `6fb172b38d16f4bb.mp3` |
| `num:584` | cinq cent quatre-vingt-quatre | `00e21fb287aac017.mp3` |
| `num:585` | cinq cent quatre-vingt-cinq | `8db0d0673a524ec7.mp3` |
| `num:586` | cinq cent quatre-vingt-six | `73da8bbadfaf7cf8.mp3` |
| `num:587` | cinq cent quatre-vingt-sept | `f1c05e5d648f7da8.mp3` |
| `num:588` | cinq cent quatre-vingt-huit | `a23c28754749a1af.mp3` |
| `num:589` | cinq cent quatre-vingt-neuf | `7ee498c71c93d3b7.mp3` |
| `num:590` | cinq cent quatre-vingt-dix | `cb88a97396d1f442.mp3` |
| `num:591` | cinq cent quatre-vingt-onze | `a0a1b1c65265eba4.mp3` |
| `num:592` | cinq cent quatre-vingt-douze | `7162108f9afaf348.mp3` |
| `num:593` | cinq cent quatre-vingt-treize | `b181773fe9523fad.mp3` |
| `num:594` | cinq cent quatre-vingt-quatorze | `b6dc3c5cec412e20.mp3` |
| `num:595` | cinq cent quatre-vingt-quinze | `513dc586469c8591.mp3` |
| `num:596` | cinq cent quatre-vingt-seize | `20bf0975ecc4fee2.mp3` |
| `num:597` | cinq cent quatre-vingt-dix-sept | `a6d8b80088aae77d.mp3` |
| `num:598` | cinq cent quatre-vingt-dix-huit | `56b931def273becc.mp3` |
| `num:599` | cinq cent quatre-vingt-dix-neuf | `58aabd13037c38c1.mp3` |
| `num:600` | six cents | `7ff224a277de74c8.mp3` |
| `num:601` | six cent un | `f1e97888cfa06fee.mp3` |
| `num:602` | six cent deux | `c81c4c68e8b86d71.mp3` |
| `num:603` | six cent trois | `4112e9120f5b908b.mp3` |
| `num:604` | six cent quatre | `0126fb8e68217f91.mp3` |
| `num:605` | six cent cinq | `852fd8d225f00631.mp3` |
| `num:606` | six cent six | `d4ab003fa44330b8.mp3` |
| `num:607` | six cent sept | `8dbbf826c3964f6c.mp3` |
| `num:608` | six cent huit | `75b58a8972b0678f.mp3` |
| `num:609` | six cent neuf | `b0febcead4fc5058.mp3` |
| `num:610` | six cent dix | `29a14e8a98ea34ec.mp3` |
| `num:611` | six cent onze | `55e23bb42d9ec629.mp3` |
| `num:612` | six cent douze | `b018a6d7aebb8126.mp3` |
| `num:613` | six cent treize | `551ce65a598d7f14.mp3` |
| `num:614` | six cent quatorze | `048a2235bb838981.mp3` |
| `num:615` | six cent quinze | `a698aaa4b97fc53a.mp3` |
| `num:616` | six cent seize | `432bb029f4e30d5f.mp3` |
| `num:617` | six cent dix-sept | `79150d3cff59e148.mp3` |
| `num:618` | six cent dix-huit | `4ae76bddb9aee6bd.mp3` |
| `num:619` | six cent dix-neuf | `8f86f55836ab9698.mp3` |
| `num:620` | six cent vingt | `75ab6718ee691486.mp3` |
| `num:621` | six cent vingt et un | `bfc6a1e985f76ca3.mp3` |
| `num:622` | six cent vingt-deux | `168d0987d740fdb7.mp3` |
| `num:623` | six cent vingt-trois | `de7e84bbe01a044c.mp3` |
| `num:624` | six cent vingt-quatre | `1e896550c4b9abea.mp3` |
| `num:625` | six cent vingt-cinq | `ce70d14d8441d3bd.mp3` |
| `num:626` | six cent vingt-six | `babf8c2d07a4783b.mp3` |
| `num:627` | six cent vingt-sept | `c5fae4e42383b416.mp3` |
| `num:628` | six cent vingt-huit | `1f41a3e85634c9c8.mp3` |
| `num:629` | six cent vingt-neuf | `0bf481dd2d1092a1.mp3` |
| `num:630` | six cent trente | `0753fdcea4037cc6.mp3` |
| `num:631` | six cent trente et un | `6e9d4f8c0cac06a3.mp3` |
| `num:632` | six cent trente-deux | `1b56f9690e7eae69.mp3` |
| `num:633` | six cent trente-trois | `e05651ab5d451b5e.mp3` |
| `num:634` | six cent trente-quatre | `37d6bb8c77748212.mp3` |
| `num:635` | six cent trente-cinq | `75202c7bc88b08bc.mp3` |
| `num:636` | six cent trente-six | `af6be14dade92471.mp3` |
| `num:637` | six cent trente-sept | `4cb9dc40eef730d7.mp3` |
| `num:638` | six cent trente-huit | `c34d128e851f5a37.mp3` |
| `num:639` | six cent trente-neuf | `de577bd94f1e7ee6.mp3` |
| `num:640` | six cent quarante | `03b06d2998b70db8.mp3` |
| `num:641` | six cent quarante et un | `533ac47778478cef.mp3` |
| `num:642` | six cent quarante-deux | `dd9866678b3c995c.mp3` |
| `num:643` | six cent quarante-trois | `d1f227e0a2d19522.mp3` |
| `num:644` | six cent quarante-quatre | `28c6753ac3dbcbdd.mp3` |
| `num:645` | six cent quarante-cinq | `e425264dd7c931a2.mp3` |
| `num:646` | six cent quarante-six | `76b929b4fd8757a0.mp3` |
| `num:647` | six cent quarante-sept | `6cd2d91815dd0017.mp3` |
| `num:648` | six cent quarante-huit | `9843aa660673104e.mp3` |
| `num:649` | six cent quarante-neuf | `62bb610b9887d8f8.mp3` |
| `num:650` | six cent cinquante | `48056c01af552ae5.mp3` |
| `num:651` | six cent cinquante et un | `81724eae350ce8de.mp3` |
| `num:652` | six cent cinquante-deux | `ff55d62c2399c30d.mp3` |
| `num:653` | six cent cinquante-trois | `44f71e23b7a21067.mp3` |
| `num:654` | six cent cinquante-quatre | `8dd0ccd79871ab83.mp3` |
| `num:655` | six cent cinquante-cinq | `9e22b1cb66fd211b.mp3` |
| `num:656` | six cent cinquante-six | `1bbe41eab80309b6.mp3` |
| `num:657` | six cent cinquante-sept | `abfd1b1d7c9c8239.mp3` |
| `num:658` | six cent cinquante-huit | `8e269ebd711a3a42.mp3` |
| `num:659` | six cent cinquante-neuf | `d49bb14200f5fc46.mp3` |
| `num:660` | six cent soixante | `79c9e125e8ad420f.mp3` |
| `num:661` | six cent soixante et un | `44f493b35f3e3587.mp3` |
| `num:662` | six cent soixante-deux | `7b8d54f03ea02095.mp3` |
| `num:663` | six cent soixante-trois | `d051eb99872c9954.mp3` |
| `num:664` | six cent soixante-quatre | `9a8fd34632eabb1d.mp3` |
| `num:665` | six cent soixante-cinq | `3a713ce4f9fbdc26.mp3` |
| `num:666` | six cent soixante-six | `247efaa04c02700b.mp3` |
| `num:667` | six cent soixante-sept | `8ba0d9347a0a21d4.mp3` |
| `num:668` | six cent soixante-huit | `482af2789a8ddf71.mp3` |
| `num:669` | six cent soixante-neuf | `92413520435384b4.mp3` |
| `num:670` | six cent soixante-dix | `5a66d657b5204265.mp3` |
| `num:671` | six cent soixante et onze | `8f677f2c145f2f8b.mp3` |
| `num:672` | six cent soixante-douze | `c9c8d7387d3d3c26.mp3` |
| `num:673` | six cent soixante-treize | `9318a8cc24302d47.mp3` |
| `num:674` | six cent soixante-quatorze | `ddeea07f3b7b52ca.mp3` |
| `num:675` | six cent soixante-quinze | `5b595350c53b521f.mp3` |
| `num:676` | six cent soixante-seize | `ca773101f2550a43.mp3` |
| `num:677` | six cent soixante-dix-sept | `cbc2862a3eda2404.mp3` |
| `num:678` | six cent soixante-dix-huit | `167733c660234f6e.mp3` |
| `num:679` | six cent soixante-dix-neuf | `49e924dae2896ee2.mp3` |
| `num:680` | six cent quatre-vingts | `46c18e4bd6175011.mp3` |
| `num:681` | six cent quatre-vingt-un | `0dc9b2e60e794ba5.mp3` |
| `num:682` | six cent quatre-vingt-deux | `9c90c53e7262dfb1.mp3` |
| `num:683` | six cent quatre-vingt-trois | `7d9a20a884e804df.mp3` |
| `num:684` | six cent quatre-vingt-quatre | `e4422f79fa22b2ea.mp3` |
| `num:685` | six cent quatre-vingt-cinq | `9ca6c08105a677d3.mp3` |
| `num:686` | six cent quatre-vingt-six | `10fd42e3520a0841.mp3` |
| `num:687` | six cent quatre-vingt-sept | `d366f8ee30572a66.mp3` |
| `num:688` | six cent quatre-vingt-huit | `043d6262fc0a99b8.mp3` |
| `num:689` | six cent quatre-vingt-neuf | `220de734c1039d21.mp3` |
| `num:690` | six cent quatre-vingt-dix | `e88c9c23d4040761.mp3` |
| `num:691` | six cent quatre-vingt-onze | `31dd7869768e5387.mp3` |
| `num:692` | six cent quatre-vingt-douze | `f9e8ef9a288f29c4.mp3` |
| `num:693` | six cent quatre-vingt-treize | `f8100840452e6d0c.mp3` |
| `num:694` | six cent quatre-vingt-quatorze | `6a0a5c0b8e0e424c.mp3` |
| `num:695` | six cent quatre-vingt-quinze | `d30bdbd71b6a6488.mp3` |
| `num:696` | six cent quatre-vingt-seize | `26117d05d1441c67.mp3` |
| `num:697` | six cent quatre-vingt-dix-sept | `11efc4e3affc8381.mp3` |
| `num:698` | six cent quatre-vingt-dix-huit | `f003b226646b2445.mp3` |
| `num:699` | six cent quatre-vingt-dix-neuf | `1e1a07ab74b7596d.mp3` |
| `num:700` | sept cents | `cf089c03b78fe528.mp3` |
| `num:701` | sept cent un | `f4a6de518579a0dc.mp3` |
| `num:702` | sept cent deux | `6d4edba0a7067381.mp3` |
| `num:703` | sept cent trois | `8350c4c7e0bb3900.mp3` |
| `num:704` | sept cent quatre | `67f0a337f9ff54de.mp3` |
| `num:705` | sept cent cinq | `08e9b128e2320b94.mp3` |
| `num:706` | sept cent six | `25fe78c239b9f545.mp3` |
| `num:707` | sept cent sept | `d57a00bf265cc891.mp3` |
| `num:708` | sept cent huit | `9014228229376267.mp3` |
| `num:709` | sept cent neuf | `a02fb7b49c18cc55.mp3` |
| `num:710` | sept cent dix | `4d21b75d5596b2f1.mp3` |
| `num:711` | sept cent onze | `d114365e8df3aad3.mp3` |
| `num:712` | sept cent douze | `3407f952a2097e95.mp3` |
| `num:713` | sept cent treize | `b6e5109fc7dece71.mp3` |
| `num:714` | sept cent quatorze | `5ea02fb09033e8b7.mp3` |
| `num:715` | sept cent quinze | `e6fbb10fbf3c94d3.mp3` |
| `num:716` | sept cent seize | `a290e2e86b0dc0f0.mp3` |
| `num:717` | sept cent dix-sept | `93e922766d958f5e.mp3` |
| `num:718` | sept cent dix-huit | `6297c51eead053a6.mp3` |
| `num:719` | sept cent dix-neuf | `876f5e6737b07758.mp3` |
| `num:720` | sept cent vingt | `d82f160a7e8553d4.mp3` |
| `num:721` | sept cent vingt et un | `ade064d179cfcdf0.mp3` |
| `num:722` | sept cent vingt-deux | `56e541fe70e7beae.mp3` |
| `num:723` | sept cent vingt-trois | `409e048b342c16f9.mp3` |
| `num:724` | sept cent vingt-quatre | `9eaa7e29b37148c4.mp3` |
| `num:725` | sept cent vingt-cinq | `a1fd58866adde9c0.mp3` |
| `num:726` | sept cent vingt-six | `ef030676150ac3f2.mp3` |
| `num:727` | sept cent vingt-sept | `21833adf610bc0ae.mp3` |
| `num:728` | sept cent vingt-huit | `6b84b2838ab3d137.mp3` |
| `num:729` | sept cent vingt-neuf | `04bfd9cccbd01c00.mp3` |
| `num:730` | sept cent trente | `e05e3e2dcb40c9e7.mp3` |
| `num:731` | sept cent trente et un | `35fbbe7552269f3c.mp3` |
| `num:732` | sept cent trente-deux | `1edcf7215b049c41.mp3` |
| `num:733` | sept cent trente-trois | `0af1cddd7d47cfc1.mp3` |
| `num:734` | sept cent trente-quatre | `0fd7e32f4653606e.mp3` |
| `num:735` | sept cent trente-cinq | `aef9a64ad98b68c5.mp3` |
| `num:736` | sept cent trente-six | `de49f6e3d3eb8fc0.mp3` |
| `num:737` | sept cent trente-sept | `dfeb339b83e20329.mp3` |
| `num:738` | sept cent trente-huit | `18062037775d3751.mp3` |
| `num:739` | sept cent trente-neuf | `cbd675e29661bc23.mp3` |
| `num:740` | sept cent quarante | `830fbfc3225f1445.mp3` |
| `num:741` | sept cent quarante et un | `86bf21a757d1bafc.mp3` |
| `num:742` | sept cent quarante-deux | `94d4c112ec53b0e2.mp3` |
| `num:743` | sept cent quarante-trois | `e4cca6ab6a727e37.mp3` |
| `num:744` | sept cent quarante-quatre | `0c83a6ba15bdf8d8.mp3` |
| `num:745` | sept cent quarante-cinq | `92400e965ca9f223.mp3` |
| `num:746` | sept cent quarante-six | `21dc97fe5a383ddd.mp3` |
| `num:747` | sept cent quarante-sept | `d1b43a8c2f93842c.mp3` |
| `num:748` | sept cent quarante-huit | `14cafbad264f4235.mp3` |
| `num:749` | sept cent quarante-neuf | `2505630d717f82d1.mp3` |
| `num:750` | sept cent cinquante | `5837a11852da48ef.mp3` |
| `num:751` | sept cent cinquante et un | `f3d0dd53bdefac3f.mp3` |
| `num:752` | sept cent cinquante-deux | `4ea7999bc4239ae8.mp3` |
| `num:753` | sept cent cinquante-trois | `25bd4e0449dfda97.mp3` |
| `num:754` | sept cent cinquante-quatre | `364ee9fa3eae04c5.mp3` |
| `num:755` | sept cent cinquante-cinq | `db0ca52670a0045f.mp3` |
| `num:756` | sept cent cinquante-six | `3f7ae18abdbd15b9.mp3` |
| `num:757` | sept cent cinquante-sept | `92fabee078d886fb.mp3` |
| `num:758` | sept cent cinquante-huit | `40b2996a1eb1950f.mp3` |
| `num:759` | sept cent cinquante-neuf | `2c0d4009110dfc71.mp3` |
| `num:760` | sept cent soixante | `d0955843d5585120.mp3` |
| `num:761` | sept cent soixante et un | `b7b6efa266cb9346.mp3` |
| `num:762` | sept cent soixante-deux | `ca37fbc340df20d0.mp3` |
| `num:763` | sept cent soixante-trois | `82db7e044ffd05d4.mp3` |
| `num:764` | sept cent soixante-quatre | `ba9c12ef2bff1314.mp3` |
| `num:765` | sept cent soixante-cinq | `14e7230329c1465f.mp3` |
| `num:766` | sept cent soixante-six | `0576993b90122553.mp3` |
| `num:767` | sept cent soixante-sept | `06d6fc77569eab40.mp3` |
| `num:768` | sept cent soixante-huit | `8c37727c22b7fb05.mp3` |
| `num:769` | sept cent soixante-neuf | `ad1257c006de6730.mp3` |
| `num:770` | sept cent soixante-dix | `6d132d6134116f6d.mp3` |
| `num:771` | sept cent soixante et onze | `b30e509e18f53962.mp3` |
| `num:772` | sept cent soixante-douze | `7b1637db56ef79b9.mp3` |
| `num:773` | sept cent soixante-treize | `9cd07c24b98236de.mp3` |
| `num:774` | sept cent soixante-quatorze | `6b1f3dbaec4648c2.mp3` |
| `num:775` | sept cent soixante-quinze | `d09e98da3855afa1.mp3` |
| `num:776` | sept cent soixante-seize | `923fa7402efd0485.mp3` |
| `num:777` | sept cent soixante-dix-sept | `1d9457e1a2c14313.mp3` |
| `num:778` | sept cent soixante-dix-huit | `af0cb0bc8ffeb994.mp3` |
| `num:779` | sept cent soixante-dix-neuf | `ad0866a7cec3dd9b.mp3` |
| `num:780` | sept cent quatre-vingts | `12b8fef91c091621.mp3` |
| `num:781` | sept cent quatre-vingt-un | `aa75dbd45a35a8ed.mp3` |
| `num:782` | sept cent quatre-vingt-deux | `2c8d92794dd48a23.mp3` |
| `num:783` | sept cent quatre-vingt-trois | `53a0002d2949a9b6.mp3` |
| `num:784` | sept cent quatre-vingt-quatre | `fd9c128e162f68d9.mp3` |
| `num:785` | sept cent quatre-vingt-cinq | `30757777daa44122.mp3` |
| `num:786` | sept cent quatre-vingt-six | `81d83231cb9eab0d.mp3` |
| `num:787` | sept cent quatre-vingt-sept | `a9183e6de904530d.mp3` |
| `num:788` | sept cent quatre-vingt-huit | `9cc74c22b629273c.mp3` |
| `num:789` | sept cent quatre-vingt-neuf | `18f169770a568a37.mp3` |
| `num:790` | sept cent quatre-vingt-dix | `c19259dbdf5d9db2.mp3` |
| `num:791` | sept cent quatre-vingt-onze | `39a3d9abcdc4dc2d.mp3` |
| `num:792` | sept cent quatre-vingt-douze | `ea7c20a635dcdffe.mp3` |
| `num:793` | sept cent quatre-vingt-treize | `606572969c2405a1.mp3` |
| `num:794` | sept cent quatre-vingt-quatorze | `96405570f8cdc774.mp3` |
| `num:795` | sept cent quatre-vingt-quinze | `62549535c622eb0a.mp3` |
| `num:796` | sept cent quatre-vingt-seize | `ff4812c8c7d6ae32.mp3` |
| `num:797` | sept cent quatre-vingt-dix-sept | `56549971f54c39f4.mp3` |
| `num:798` | sept cent quatre-vingt-dix-huit | `f3b5d0a97685b3d1.mp3` |
| `num:799` | sept cent quatre-vingt-dix-neuf | `de0b7b96f8de491c.mp3` |
| `num:800` | huit cents | `a1b497fa3a83cbce.mp3` |
| `num:801` | huit cent un | `e28f6b2930e1b386.mp3` |
| `num:802` | huit cent deux | `0b9ca5a8d04a8679.mp3` |
| `num:803` | huit cent trois | `f69a022bb63e270a.mp3` |
| `num:804` | huit cent quatre | `98debee2fc17d722.mp3` |
| `num:805` | huit cent cinq | `8a8d4f5af9b80e9c.mp3` |
| `num:806` | huit cent six | `155ebf401f2b871d.mp3` |
| `num:807` | huit cent sept | `73a796c29fcb15b1.mp3` |
| `num:808` | huit cent huit | `3b770aacbd147672.mp3` |
| `num:809` | huit cent neuf | `da3d7bb08fa42682.mp3` |
| `num:810` | huit cent dix | `c920b6158445b2a9.mp3` |
| `num:811` | huit cent onze | `d8c42174abec9bad.mp3` |
| `num:812` | huit cent douze | `a3ed9a25750e1663.mp3` |
| `num:813` | huit cent treize | `9d7e71034f303f1f.mp3` |
| `num:814` | huit cent quatorze | `438d5caf127780c3.mp3` |
| `num:815` | huit cent quinze | `8c65245886a0fe01.mp3` |
| `num:816` | huit cent seize | `152f51728f3cc4ef.mp3` |
| `num:817` | huit cent dix-sept | `68671bfa5b890f03.mp3` |
| `num:818` | huit cent dix-huit | `df4c7b0993306e93.mp3` |
| `num:819` | huit cent dix-neuf | `68bd92d54ba2bc27.mp3` |
| `num:820` | huit cent vingt | `69ccd4d3699795a3.mp3` |
| `num:821` | huit cent vingt et un | `5ae7ac1f1b97f26f.mp3` |
| `num:822` | huit cent vingt-deux | `fc34d15c6ee2f71f.mp3` |
| `num:823` | huit cent vingt-trois | `3ee32d8c8e4ec59a.mp3` |
| `num:824` | huit cent vingt-quatre | `7f11d3406102bdee.mp3` |
| `num:825` | huit cent vingt-cinq | `6e18f1cde0fd9b2a.mp3` |
| `num:826` | huit cent vingt-six | `9c8f8a2db3054daf.mp3` |
| `num:827` | huit cent vingt-sept | `cfd5b28fdb5fe8f2.mp3` |
| `num:828` | huit cent vingt-huit | `47d1f24f707b9f31.mp3` |
| `num:829` | huit cent vingt-neuf | `ea5d4177a15dd816.mp3` |
| `num:830` | huit cent trente | `e8182bb065b441a4.mp3` |
| `num:831` | huit cent trente et un | `1c87cf0716cb9e0a.mp3` |
| `num:832` | huit cent trente-deux | `67d5c426a817691e.mp3` |
| `num:833` | huit cent trente-trois | `99d33f650aaa9a35.mp3` |
| `num:834` | huit cent trente-quatre | `7041b6f77ebb90c2.mp3` |
| `num:835` | huit cent trente-cinq | `04ed2000ecb83b75.mp3` |
| `num:836` | huit cent trente-six | `63cc8f717abe45fa.mp3` |
| `num:837` | huit cent trente-sept | `c66e8ede195a22d5.mp3` |
| `num:838` | huit cent trente-huit | `0656106d4750cde9.mp3` |
| `num:839` | huit cent trente-neuf | `4c1534dc2b0bde79.mp3` |
| `num:840` | huit cent quarante | `d57ee65cfae9c2a3.mp3` |
| `num:841` | huit cent quarante et un | `b58f5d4e187d6d3b.mp3` |
| `num:842` | huit cent quarante-deux | `5561087154072ea4.mp3` |
| `num:843` | huit cent quarante-trois | `6d0d2537b9719cb2.mp3` |
| `num:844` | huit cent quarante-quatre | `8f53f5eff2ad94d4.mp3` |
| `num:845` | huit cent quarante-cinq | `a1efbe8eda7262af.mp3` |
| `num:846` | huit cent quarante-six | `85b92805a3caa3d4.mp3` |
| `num:847` | huit cent quarante-sept | `b51110cb1866c088.mp3` |
| `num:848` | huit cent quarante-huit | `c7bece020bc7ca94.mp3` |
| `num:849` | huit cent quarante-neuf | `3cf62a788687b8e5.mp3` |
| `num:850` | huit cent cinquante | `09e5a97fa58305ce.mp3` |
| `num:851` | huit cent cinquante et un | `f0552476ea17c2aa.mp3` |
| `num:852` | huit cent cinquante-deux | `afdbe53e7ab06d02.mp3` |
| `num:853` | huit cent cinquante-trois | `9855e9a7b30b9c7f.mp3` |
| `num:854` | huit cent cinquante-quatre | `7107f2e3cded74df.mp3` |
| `num:855` | huit cent cinquante-cinq | `41d487cd8d6ed9b8.mp3` |
| `num:856` | huit cent cinquante-six | `dc385ff7735dec04.mp3` |
| `num:857` | huit cent cinquante-sept | `22e845d99bd14158.mp3` |
| `num:858` | huit cent cinquante-huit | `8666495581ffd6df.mp3` |
| `num:859` | huit cent cinquante-neuf | `c38762bf857d22ad.mp3` |
| `num:860` | huit cent soixante | `f2e3884663bae31a.mp3` |
| `num:861` | huit cent soixante et un | `7bbe23a7cf38b677.mp3` |
| `num:862` | huit cent soixante-deux | `97e2482d53b6c222.mp3` |
| `num:863` | huit cent soixante-trois | `77a08c5aac0ddd70.mp3` |
| `num:864` | huit cent soixante-quatre | `5cf3a8359fcbfe07.mp3` |
| `num:865` | huit cent soixante-cinq | `68a8a34bb1e79df6.mp3` |
| `num:866` | huit cent soixante-six | `1989f73847d14ba5.mp3` |
| `num:867` | huit cent soixante-sept | `a19a309b463e1a52.mp3` |
| `num:868` | huit cent soixante-huit | `ecc3fdfac441a44d.mp3` |
| `num:869` | huit cent soixante-neuf | `231632810e3c16d3.mp3` |
| `num:870` | huit cent soixante-dix | `5448ad588f0d289b.mp3` |
| `num:871` | huit cent soixante et onze | `bd2f65f78f6b8dae.mp3` |
| `num:872` | huit cent soixante-douze | `7e68e9ffea37228f.mp3` |
| `num:873` | huit cent soixante-treize | `770da83041bc25e2.mp3` |
| `num:874` | huit cent soixante-quatorze | `68a2692b09bd066a.mp3` |
| `num:875` | huit cent soixante-quinze | `5422332a7b55a02b.mp3` |
| `num:876` | huit cent soixante-seize | `1ddcf33271098ee8.mp3` |
| `num:877` | huit cent soixante-dix-sept | `dc091c91b8e0eccd.mp3` |
| `num:878` | huit cent soixante-dix-huit | `fe574c1c37768a26.mp3` |
| `num:879` | huit cent soixante-dix-neuf | `a794f43bf6790ed1.mp3` |
| `num:880` | huit cent quatre-vingts | `64e3aefc3d92e060.mp3` |
| `num:881` | huit cent quatre-vingt-un | `b7ee79e07c343c19.mp3` |
| `num:882` | huit cent quatre-vingt-deux | `ad487a3240c44f35.mp3` |
| `num:883` | huit cent quatre-vingt-trois | `acf78f8505c355f3.mp3` |
| `num:884` | huit cent quatre-vingt-quatre | `543bf913ae6a2f8d.mp3` |
| `num:885` | huit cent quatre-vingt-cinq | `120be372eea3f653.mp3` |
| `num:886` | huit cent quatre-vingt-six | `9c2fcf2af6fe9c7a.mp3` |
| `num:887` | huit cent quatre-vingt-sept | `d0800e7e592a2723.mp3` |
| `num:888` | huit cent quatre-vingt-huit | `3ffe943e622db87a.mp3` |
| `num:889` | huit cent quatre-vingt-neuf | `ad5e49516d79634d.mp3` |
| `num:890` | huit cent quatre-vingt-dix | `6070b358018d5cce.mp3` |
| `num:891` | huit cent quatre-vingt-onze | `39b447628bc481e4.mp3` |
| `num:892` | huit cent quatre-vingt-douze | `808cbd3617ff3fd2.mp3` |
| `num:893` | huit cent quatre-vingt-treize | `e90f5230cfbedf3d.mp3` |
| `num:894` | huit cent quatre-vingt-quatorze | `7da6a534784b4125.mp3` |
| `num:895` | huit cent quatre-vingt-quinze | `5a3faf17e81d718f.mp3` |
| `num:896` | huit cent quatre-vingt-seize | `5b10c3013d2dbf55.mp3` |
| `num:897` | huit cent quatre-vingt-dix-sept | `1e0081d7b72a9b5e.mp3` |
| `num:898` | huit cent quatre-vingt-dix-huit | `8b2c2e222632cf4c.mp3` |
| `num:899` | huit cent quatre-vingt-dix-neuf | `1c6486f4d66695f0.mp3` |
| `num:900` | neuf cents | `967d2974166432e3.mp3` |
| `num:901` | neuf cent un | `39efe118400b7b1c.mp3` |
| `num:902` | neuf cent deux | `003f0a6a520b38e4.mp3` |
| `num:903` | neuf cent trois | `c76bea379a83c5c4.mp3` |
| `num:904` | neuf cent quatre | `3ae26d1e9b568a94.mp3` |
| `num:905` | neuf cent cinq | `ab79021f2e86b93f.mp3` |
| `num:906` | neuf cent six | `65a074ad60d621be.mp3` |
| `num:907` | neuf cent sept | `58a4d6cfe05a7d2a.mp3` |
| `num:908` | neuf cent huit | `35e344dcd949045e.mp3` |
| `num:909` | neuf cent neuf | `4dece926b542fad4.mp3` |
| `num:910` | neuf cent dix | `3c01937fc19f7b8c.mp3` |
| `num:911` | neuf cent onze | `5273142e3ff16cf2.mp3` |
| `num:912` | neuf cent douze | `448da631a30a09e7.mp3` |
| `num:913` | neuf cent treize | `abce01d056e22764.mp3` |
| `num:914` | neuf cent quatorze | `e443a9c2713b0050.mp3` |
| `num:915` | neuf cent quinze | `68d9ac5d980d9fdf.mp3` |
| `num:916` | neuf cent seize | `7ac959bddc6dc525.mp3` |
| `num:917` | neuf cent dix-sept | `d65219ef3792b5ca.mp3` |
| `num:918` | neuf cent dix-huit | `743b9fd92f8e90e4.mp3` |
| `num:919` | neuf cent dix-neuf | `b19541d843fc8a7a.mp3` |
| `num:920` | neuf cent vingt | `23c9fda3e3c5f52e.mp3` |
| `num:921` | neuf cent vingt et un | `9f99c8177c3e4432.mp3` |
| `num:922` | neuf cent vingt-deux | `0cceff14c5337a45.mp3` |
| `num:923` | neuf cent vingt-trois | `fddfc08f96909815.mp3` |
| `num:924` | neuf cent vingt-quatre | `f0150808498ac73e.mp3` |
| `num:925` | neuf cent vingt-cinq | `2708a8e4ef17e5cd.mp3` |
| `num:926` | neuf cent vingt-six | `a7114eac3e869462.mp3` |
| `num:927` | neuf cent vingt-sept | `faaf736523ffa31f.mp3` |
| `num:928` | neuf cent vingt-huit | `4287c4d55dc32153.mp3` |
| `num:929` | neuf cent vingt-neuf | `65b6e49f7384aae2.mp3` |
| `num:930` | neuf cent trente | `54d308f93c73363f.mp3` |
| `num:931` | neuf cent trente et un | `38b99273bb3ec123.mp3` |
| `num:932` | neuf cent trente-deux | `74e43b8f6eb0d546.mp3` |
| `num:933` | neuf cent trente-trois | `843a049a8649fd71.mp3` |
| `num:934` | neuf cent trente-quatre | `4a7c8f61d0140567.mp3` |
| `num:935` | neuf cent trente-cinq | `610b4c477e181c9e.mp3` |
| `num:936` | neuf cent trente-six | `dc94c6ed35cfc3f0.mp3` |
| `num:937` | neuf cent trente-sept | `869d4a848f39f1ce.mp3` |
| `num:938` | neuf cent trente-huit | `78436f4c008e2c0e.mp3` |
| `num:939` | neuf cent trente-neuf | `4ac1ab29cb3f973d.mp3` |
| `num:940` | neuf cent quarante | `cc43de098785d6ab.mp3` |
| `num:941` | neuf cent quarante et un | `9a4d408e24a404c5.mp3` |
| `num:942` | neuf cent quarante-deux | `c5ee97d46905da1b.mp3` |
| `num:943` | neuf cent quarante-trois | `6a19ceffd944a089.mp3` |
| `num:944` | neuf cent quarante-quatre | `7fd8507110c500e9.mp3` |
| `num:945` | neuf cent quarante-cinq | `38d20398aa2aceb4.mp3` |
| `num:946` | neuf cent quarante-six | `d62e8beda9fab921.mp3` |
| `num:947` | neuf cent quarante-sept | `2d23b0138acf6061.mp3` |
| `num:948` | neuf cent quarante-huit | `178b9c41e19ad7ef.mp3` |
| `num:949` | neuf cent quarante-neuf | `cfbab497e49df90b.mp3` |
| `num:950` | neuf cent cinquante | `a731dddc803c8607.mp3` |
| `num:951` | neuf cent cinquante et un | `cd9f86c308bb1fb0.mp3` |
| `num:952` | neuf cent cinquante-deux | `dcb2076e7029533b.mp3` |
| `num:953` | neuf cent cinquante-trois | `9aa32918c6ca4422.mp3` |
| `num:954` | neuf cent cinquante-quatre | `3ad77da8148cd24d.mp3` |
| `num:955` | neuf cent cinquante-cinq | `6148b0de3d47dae1.mp3` |
| `num:956` | neuf cent cinquante-six | `4a98f579865b6bea.mp3` |
| `num:957` | neuf cent cinquante-sept | `dd48a082c96547c0.mp3` |
| `num:958` | neuf cent cinquante-huit | `20f858a63c85377e.mp3` |
| `num:959` | neuf cent cinquante-neuf | `f334e29d703224fa.mp3` |
| `num:960` | neuf cent soixante | `9718059cd5d40020.mp3` |
| `num:961` | neuf cent soixante et un | `2d1fe73ea94f2cef.mp3` |
| `num:962` | neuf cent soixante-deux | `bae9e1e0a2909067.mp3` |
| `num:963` | neuf cent soixante-trois | `759fb962c2d9c861.mp3` |
| `num:964` | neuf cent soixante-quatre | `ee1224c427ca33cc.mp3` |
| `num:965` | neuf cent soixante-cinq | `d78ca3f43d75e453.mp3` |
| `num:966` | neuf cent soixante-six | `aab11587261a2d69.mp3` |
| `num:967` | neuf cent soixante-sept | `007da06ab79c57c3.mp3` |
| `num:968` | neuf cent soixante-huit | `21400b88fddf7ac4.mp3` |
| `num:969` | neuf cent soixante-neuf | `b239afa499796077.mp3` |
| `num:970` | neuf cent soixante-dix | `b4310f77e9f885ea.mp3` |
| `num:971` | neuf cent soixante et onze | `65a0e47e38007cb0.mp3` |
| `num:972` | neuf cent soixante-douze | `4ed092922eed69f4.mp3` |
| `num:973` | neuf cent soixante-treize | `ebb0926386611e6a.mp3` |
| `num:974` | neuf cent soixante-quatorze | `67d5b5e60e43d11c.mp3` |
| `num:975` | neuf cent soixante-quinze | `e60e4a32a3d6af87.mp3` |
| `num:976` | neuf cent soixante-seize | `8b6f4bdba5c32735.mp3` |
| `num:977` | neuf cent soixante-dix-sept | `980d4a93f682209f.mp3` |
| `num:978` | neuf cent soixante-dix-huit | `2357bc9030741ff7.mp3` |
| `num:979` | neuf cent soixante-dix-neuf | `6dc6d9615437cf9c.mp3` |
| `num:980` | neuf cent quatre-vingts | `81b33b9a8b56dca8.mp3` |
| `num:981` | neuf cent quatre-vingt-un | `bcc4d9dd63b2ce13.mp3` |
| `num:982` | neuf cent quatre-vingt-deux | `4ae409f7b9d10c85.mp3` |
| `num:983` | neuf cent quatre-vingt-trois | `8baddc01fb456c39.mp3` |
| `num:984` | neuf cent quatre-vingt-quatre | `a94edf8bbf97c3c3.mp3` |
| `num:985` | neuf cent quatre-vingt-cinq | `b34747258e4052f1.mp3` |
| `num:986` | neuf cent quatre-vingt-six | `cfaf901d18d7e0e1.mp3` |
| `num:987` | neuf cent quatre-vingt-sept | `66f366f092ef3593.mp3` |
| `num:988` | neuf cent quatre-vingt-huit | `7a87e5685e3763d0.mp3` |
| `num:989` | neuf cent quatre-vingt-neuf | `047d307a82750770.mp3` |
| `num:990` | neuf cent quatre-vingt-dix | `c97c5a4f340534b0.mp3` |
| `num:991` | neuf cent quatre-vingt-onze | `b388f68fab775d2b.mp3` |
| `num:992` | neuf cent quatre-vingt-douze | `1f3e4ba580027354.mp3` |
| `num:993` | neuf cent quatre-vingt-treize | `4d8c8651c7681801.mp3` |
| `num:994` | neuf cent quatre-vingt-quatorze | `4db3b77d7381aa83.mp3` |
| `num:995` | neuf cent quatre-vingt-quinze | `baf78099233d3bb9.mp3` |
| `num:996` | neuf cent quatre-vingt-seize | `36f22bbcbdd4d65e.mp3` |
| `num:997` | neuf cent quatre-vingt-dix-sept | `3724200a7e7b088e.mp3` |
| `num:998` | neuf cent quatre-vingt-dix-huit | `03d2fcf13a2cb6b0.mp3` |
| `num:999` | neuf cent quatre-vingt-dix-neuf | `f6a9255d622b1195.mp3` |
| `num:1000` | mille | `b00cc7ac83c0ded5.mp3` |
| `num:2000` | deux mille | `f02305190c849bfc.mp3` |
| `num:3000` | trois mille | `f63dd433973f6bb3.mp3` |
| `num:4000` | quatre mille | `624d0ef7f54164fb.mp3` |
| `num:5000` | cinq mille | `b9a997daab0f2d20.mp3` |
| `num:6000` | six mille | `31a070e56c56efbb.mp3` |
| `num:7000` | sept mille | `6cd7b84450b573cf.mp3` |
| `num:8000` | huit mille | `453c5765ffb2dadd.mp3` |
| `num:9000` | neuf mille | `1c73c3c9102e07b7.mp3` |
| `num:10000` | dix mille | `02a5edbbfa5ef8ba.mp3` |

## Consignes (18)

| Clé | Texte à dire | Nom de fichier |
|---|---|---|
| `consigne:reflechis-bien` | Réfléchis bien. | `caedbb93937198aa.mp3` |
| `consigne:recommence` | On recommence. | `5e8c142e38f570c8.mp3` |
| `consigne:pause` | Pause ! | `12c98430462d799e.mp3` |
| `consigne:regarde-le-tableau` | Regarde bien le tableau. | `e55d994243aba8f6.mp3` |
| `consigne:regarde-le-diagramme` | Regarde bien le diagramme. | `e2f73c3980d749b6.mp3` |
| `consigne:clique-sur-la-barre-la-plus-haute` | Clique sur la barre la plus haute. | `e98fef4b2e20a222.mp3` |
| `consigne:regle-la-barre` | Touche la bonne hauteur au-dessus de la barre. | `ca2c20c52af08c8f.mp3` |
| `consigne:lis-le-texte` | Lis bien le texte dans ta tête. | `586ce69f6f84387d.mp3` |
| `consigne:clique-sur-le-mot` | Clique dans le texte sur le bon mot. | `134d4dc586fdade0.mp3` |
| `consigne:range-dans-lordre` | Range les moments de l'histoire dans l'ordre. | `57d7e3dd9c82d649.mp3` |
| `consigne:touche-les-noeuds` | Touche les nœuds du quadrillage pour placer les coins. | `095d66073504d0ce.mp3` |
| `consigne:construis-la-figure` | Construis la figure demandée sur le quadrillage. | `333d9d61720f8156.mp3` |
| `consigne:assemble-le-programme` | Assemble les cartes pour amener le robot jusqu'à la case verte. | `e1c71a35dcb47631.mp3` |
| `consigne:clique-case-arrivee` | Clique sur la case où le robot arrive. | `bed64f29eb4ab8f9.mp3` |
| `consigne:reproduis-la-figure` | Reproduis la même figure sur le quadrillage, de nœud en nœud. | `43b174b4d93e20d9.mp3` |
| `consigne:refais-de-memoire` | Observe bien la figure. Elle va se cacher. Refais-la ensuite de mémoire. | `13f3c79bbad2bdad.mp3` |
| `consigne:complete-le-sommet` | Il manque un coin. Touche le nœud qui complète la figure. | `84d151b8d6d0a9fe.mp3` |
| `consigne:touche-angles-droits` | Touche tous les coins qui sont des angles droits. | `83f5b45acfd0a2cb.mp3` |

## Messages (17)

| Clé | Texte à dire | Nom de fichier |
|---|---|---|
| `msg:trait-union` | N'oublie pas les traits d'union entre les nombres. | `466b5c0f0b58afdd.mp3` |
| `msg:encore-un-effort` | Encore un petit effort, tu y es presque ! | `f59a0124a4c45b9b.mp3` |
| `msg:convertis-avant` | N'oublie pas de convertir avant de calculer. | `12f85b49e311ecaf.mp3` |
| `msg:croise-ligne-colonne` | Pour lire une case, croise la ligne et la colonne. L'endroit où elles se rejoignent donne le nombre. | `77ab6631bd005a46.mp3` |
| `msg:lis-la-hauteur-barre` | La hauteur d'une barre se lit en face du trait tout en haut. Par exemple, la barre des pommes monte jusqu'à six. | `658b7bac1a365718.mp3` |
| `msg:image-vaut-plusieurs` | Dans un pictogramme, une image peut valoir plusieurs objets. Si une image vaut deux, trois images font six. | `7f2146a5bf75bc7f.mp3` |
| `msg:passe-compose-etre` | Avec être, le participe s'accorde avec le sujet. | `8869bb8cf5a26ef1.mp3` |
| `msg:accord-etre-fille` | Avec est, on ajoute un e à la fin pour une fille : elle est allée. | `7a962e164da53fbb.mp3` |
| `msg:accord-sont-plusieurs` | Avec sont, on ajoute un s à la fin pour plusieurs : ils sont allés. | `773292a40a850e53.mp3` |
| `msg:auxiliaire-etre-exemple` | On dit : il est allé. On ne dit pas : il a allé. | `a2160a83c506959c.mp3` |
| `msg:metre-cent-centimetres` | Attention, un mètre, c'est cent centimètres. Donc trois mètres, c'est trois cents centimètres. | `8f89f628c8b11b8b.mp3` |
| `msg:grammaire-regarde` | Ce n'est pas tout à fait ça. Regarde la réponse. | `4d3fe5967332a511.mp3` |
| `msg:construis-compte-carreaux` | Pour construire ta figure, compte bien les carreaux sur chaque côté. Dans un carré, tous les côtés ont le même nombre de carreaux. | `1e41561b33a3e209.mp3` |
| `msg:robot-avance-case` | Le robot avance d'une seule case à la fois, tout droit, du côté où il regarde. Quand il tourne, il change de direction mais il reste sur sa case. | `be4bdeee478daf7f.mp3` |
| `msg:programme-eviter-obstacles` | Regarde bien où sont les cases grises. Fais passer le robot à côté, jamais dessus, pour arriver jusqu'à la case verte. | `c720c838327f1301.mp3` |
| `msg:reproduis-compte-carreaux` | Pour reproduire la figure, compte les carreaux de chaque côté comme sur le modèle. Tu peux la tracer un peu plus loin, c'est la même figure. | `e63716cd1f14eb4b.mp3` |
| `msg:angle-droit-equerre` | Un angle droit est bien carré, comme le coin d'une feuille. Pose le coin de ton équerre dessus pour vérifier. | `3198a852ac8a4f4c.mp3` |

## Titres (15)

| Clé | Texte à dire | Nom de fichier |
|---|---|---|
| `titre:tables-addition` | Tables d'addition | `38cbce4c64fd56d4.mp3` |
| `titre:doubles` | Les doubles | `402d5c55d7a16081.mp3` |
| `titre:moities` | Les moitiés | `fd553990edd2e057.mp3` |
| `titre:division-reste` | Division avec reste | `992154ee7af980e8.mp3` |
| `titre:nombres-10000` | Lire et écrire les nombres jusqu'à dix mille | `9f367ad9dfe1a9f9.mp3` |
| `titre:addition-posee` | Addition posée | `e06959e7e2fe64d9.mp3` |
| `titre:soustraction-posee` | Soustraction posée | `e6f84802bfaef8a6.mp3` |
| `titre:multiplication-posee` | Multiplication posée | `a915cdbd2056c00d.mp3` |
| `titre:problemes-add-sous` | Problèmes, additions et soustractions | `4a07fde2c8b44aea.mp3` |
| `titre:lire-heure` | Lire et écrire l'heure | `b59ce65b7de6852c.mp3` |
| `titre:fractions-simples` | Fractions simples | `5e1b51a4239a67bd.mp3` |
| `titre:dictee-detective` | Dictée détective | `f038c945d8a6cd94.mp3` |
| `titre:conjugaison-passe-compose` | Conjuguer au passé composé | `081108d6da729445.mp3` |
| `titre:problemes-mesures` | Problèmes de mesures | `eb1e3c7b526169e1.mp3` |
| `titre:mots-maitresse` | Les mots de la maîtresse | `0c24baae31bcc06a.mp3` |

## Indices (58)

| Clé | Texte à dire | Nom de fichier |
|---|---|---|
| `indice:fr-conj-present` | Le présent, c'est maintenant. Regarde bien le petit mot devant le verbe. Avec nous, le verbe finit souvent par ons. Avec vous, il finit souvent par ez. | `b7020212e2b47c01.mp3` |
| `indice:fr-conj-futur` | Le futur, c'est demain. Souvent, on entend le son r juste avant la fin, comme dans je chanterai. | `b4c8a366d59f2885.mp3` |
| `indice:fr-conj-imparfait` | L'imparfait, c'est avant, autrefois. Souvent le verbe se termine par ais, ait ou aient. | `2920a5160148928b.mp3` |
| `indice:fr-conj-passe-compose` | Le passé composé, c'est deux mots. D'abord avoir ou être, puis le verbe. Avec être, pense à accorder avec le sujet. | `4961f98f6a1b32ef.mp3` |
| `indice:fr-ortho-detective` | Lis la phrase tout doucement dans ta tête. Cherche les petits mots qui se ressemblent et qui se cachent. | `0428073a1381f523.mp3` |
| `indice:ma-cm-addition` | Tu peux passer par un nombre rond, comme dix ou vingt, pour aller plus vite. | `fb3bba9df527835f.mp3` |
| `indice:ma-cm-compl-sup` | Demande-toi combien il manque pour arriver jusqu'au nombre. | `123934582ff78b92.mp3` |
| `indice:ma-cm-div-reste` | Cherche combien de fois le petit nombre entre dans le grand. Ce qui dépasse, c'est le reste. | `04054f8bf47f2708.mp3` |
| `indice:ma-cm-doubles` | Le double, c'est deux fois le même nombre. Tu l'ajoutes avec lui-même. | `891a8ea897d0dd09.mp3` |
| `indice:ma-cm-moities` | La moitié, c'est partager le nombre en deux parts égales. | `5cdbaaeac2148312.mp3` |
| `indice:ma-cm-sommes-diff` | Tu peux passer par un nombre rond pour calculer plus facilement. | `15c1619d0072453e.mp3` |
| `indice:ma-frac-simples` | Le chiffre du bas dit en combien de parts on coupe. Le chiffre du haut dit combien de parts on prend. | `6db9ae9520f21d15.mp3` |
| `indice:ma-mes-durees` | Pense à tout mettre dans la même unité. Une heure, c'est soixante minutes. | `050163e73b786ac4.mp3` |
| `indice:ma-mes-heure` | Regarde d'abord la petite aiguille pour les heures, puis la grande aiguille pour les minutes. | `06492b038d0f7045.mp3` |
| `indice:ma-mes-longueurs` | Pense à tout mettre dans la même unité. Un mètre, c'est cent centimètres. | `073c50a96077bb7d.mp3` |
| `indice:ma-mes-masses-contenances` | Pense à tout mettre dans la même unité. Un kilo, c'est mille grammes. Un litre, c'est mille millilitres. | `0c6733eef2104dee.mp3` |
| `indice:ma-num-comparer` | Regarde d'abord lequel a le plus de chiffres. S'ils en ont autant, compare les chiffres un par un en partant de la gauche. | `1433f1050249f089.mp3` |
| `indice:ma-num-decomposer` | Coupe le nombre en tranches : les milliers, les centaines, les dizaines et les unités. | `bd209df3645c5a7f.mp3` |
| `indice:ma-num-lire-ecrire` | Coupe le nombre en tranches : d'abord les milliers, puis les centaines, puis le reste. | `20cb5f01de3397da.mp3` |
| `indice:ma-num-suite` | Regarde de combien on avance à chaque fois entre deux nombres. | `dc3dd81758a1d276.mp3` |
| `indice:ma-pb-add-sub` | Demande-toi si on met ensemble ou si on enlève. | `ce6cff6dceab0abf.mp3` |
| `indice:ma-pb-deux-etapes` | Fais une étape à la fois. Trouve d'abord le premier résultat, puis sers-t'en pour la suite. | `7c8d87e0cd508d89.mp3` |
| `indice:ma-pb-mesures` | Pense à tout mettre dans la même unité avant de calculer. | `7fa0ad16f602ce94.mp3` |
| `indice:ma-pb-monnaie` | Compte d'abord les grosses pièces, puis ajoute les petites. | `f4c3a9d91e05f1a7.mp3` |
| `indice:ma-pb-mult-div` | Demande-toi si on partage en parts égales ou si on groupe par paquets. | `6d5d91a3d7b1076c.mp3` |
| `indice:ma-pose-addition` | Commence par les unités, à droite. Quand tu dépasses neuf, tu poses une retenue. | `7868ca4b6408b6b2.mp3` |
| `indice:ma-pose-soustraction` | Commence par les unités, à droite. Si le chiffre du haut est trop petit, tu empruntes une dizaine à côté. | `614494154e60d51b.mp3` |
| `indice:ma-pose-multiplication` | Commence par les unités, à droite, et n'oublie pas les retenues. | `bd25e08dc4de4535.mp3` |
| `indice:fr-gram-nature` | Le nom dit une personne, un animal ou une chose, comme chat. Le verbe dit une action, comme jouer. L'adjectif décrit, comme grand. Le petit mot devant le nom est un déterminant. | `4ef227921dab0bb2.mp3` |
| `indice:fr-gram-sujet-verbe` | Le verbe dit l'action. Pour trouver le sujet, demande-toi qui fait l'action, comme dans la fille court. | `d345a0fb48664dbd.mp3` |
| `indice:fr-gram-types-phrases` | Écoute la phrase. Si elle attend une réponse, elle pose une question. Si elle montre une émotion forte, c'est une exclamation. Si elle commande, elle donne un ordre. | `0e8a6b9d8ab4d221.mp3` |
| `indice:fr-gram-ponctuation` | On met un point quand la phrase raconte quelque chose. On met un point d'interrogation quand la phrase pose une question. Un nom de personne ou de ville prend une majuscule. | `b7c4a751f38c64c8.mp3` |
| `indice:fr-gram-groupe-nominal` | Regarde le petit mot du début. Le mot les montre qu'il y a plusieurs choses, c'est le pluriel. Le nom dit la chose, l'adjectif la décrit. | `5e715173a7fc067a.mp3` |
| `indice:fr-voc-alphabet` | Dans le dictionnaire, les mots sont rangés par la première lettre. Si deux mots commencent par la même lettre, on regarde la lettre d'après. | `c32f3ddeec111e06.mp3` |
| `indice:fr-voc-familles` | Les mots d'une même famille se ressemblent au début et parlent de la même chose. Cherche le petit morceau qu'ils ont en commun, comme dent dans dentiste. | `f5b1373e9c95d54a.mp3` |
| `indice:fr-voc-syn-contraires` | Un synonyme veut dire presque la même chose. Un contraire veut dire le contraire. Parfois on ajoute un petit mot devant pour dire le contraire, comme mal ou dé. | `c1c3b03d32c58943.mp3` |
| `indice:fr-voc-prefixe-suffixe` | Un préfixe se met au début du mot, comme re qui veut dire encore. Un petit bout à la fin, comme eur, montre la personne qui fait l'action. | `3407060fb27896e4.mp3` |
| `indice:fr-voc-categories` | Cherche le mot général qui regroupe tous les autres. Le chien et le chat sont des animaux. | `ba437892b09f5df5.mp3` |
| `indice:fr-mots-invariables` | Ces petits mots ne changent jamais. Écoute bien les lettres de la fin qu'on n'entend pas, comme le s de toujours ou le p de beaucoup. | `1adc7f043fdd819a.mp3` |
| `indice:ma-geo-figures` | Compte les côtés et regarde les coins. Le carré a quatre côtés pareils. Le rectangle a des côtés longs et des côtés courts. Le triangle a trois côtés. Le cercle est tout rond, sans coin. | `3c52eaadd90958e6.mp3` |
| `indice:ma-geo-vocabulaire` | Un côté, c'est un bord droit. Un sommet, c'est un coin où deux côtés se rejoignent. Un angle droit est bien carré, comme le coin d'une feuille. | `535582f691d4f35a.mp3` |
| `indice:ma-geo-solides` | Pense à un objet qui a la même forme. Le cube est comme un dé, le pavé comme une boîte, la boule comme un ballon, le cylindre comme une boîte de conserve. | `5ebfca57ada70312.mp3` |
| `indice:ma-geo-symetrie` | Imagine que tu plies la figure sur le trait du milieu. Si les deux moitiés se posent l'une sur l'autre, il y a un axe de symétrie. | `1bef08ff6a44e4f2.mp3` |
| `indice:ma-repere-quadrillage` | Pour trouver une case, lis d'abord la lettre de la colonne, puis le numéro de la ligne. La lettre d'abord, le chiffre ensuite. | `809473d8cf26805b.mp3` |
| `indice:ma-repere-deplacements` | Avance une case à la fois. Vers la droite, tu changes de colonne. Vers le haut, tu changes de ligne et tu montes. | `1ee70b006ee8011b.mp3` |
| `indice:ma-repere-plan` | Place-toi à côté de l'objet. Ce qui est du côté de la main qui écrit est à droite, l'autre côté est à gauche. | `8073d24795454994.mp3` |
| `indice:ma-geo-construire` | Touche les nœuds du quadrillage pour poser les coins. Le trait se trace tout seul entre deux points. Compte bien les carreaux de chaque côté. | `86b7c865b00b6e6f.mp3` |
| `indice:ma-repere-programmer` | Lis les cartes une par une, dans l'ordre. Fais avancer le robot case par case. Quand il tourne à droite ou à gauche, il change de direction avant de repartir. | `596f62302052a845.mp3` |
| `indice:ma-donnees-tableau` | Pour lire une case, suis d'abord la ligne, puis descends dans la bonne colonne. L'endroit où la ligne et la colonne se croisent donne le nombre. | `83921e4a7a275e37.mp3` |
| `indice:ma-donnees-completer` | Regarde le total. Additionne les nombres que tu connais, puis cherche ce qu'il manque pour arriver jusqu'au total. | `1425748120975f17.mp3` |
| `indice:ma-donnees-barres` | Suis la barre jusqu'en haut, puis regarde le trait en face. Le nombre à côté de ce trait donne la hauteur de la barre. | `9a7c43d04e316076.mp3` |
| `indice:ma-donnees-pictogramme` | Compte les images d'une ligne. Si chaque image vaut deux objets, ajoute deux pour chaque image, comme deux et deux et deux. | `1c6b98a4352453bc.mp3` |
| `indice:ma-donnees-comparer` | Lis d'abord les deux nombres. Pour savoir combien il y en a de plus, enlève le plus petit nombre du plus grand. | `bd437c8670746292.mp3` |
| `indice:fr-lecture-info` | Relis le texte tout doucement. La réponse est écrite dans le texte. Cherche le mot ou le petit groupe de mots qui répond à la question. | `5254158ff3d95aed.mp3` |
| `indice:fr-lecture-inference` | Le texte ne dit pas tout. Regarde ce que fait le personnage ou ce qui se passe, et devine. Par exemple, s'il saute de joie, c'est qu'il est content. | `48dfdd304b65d233.mp3` |
| `indice:fr-lecture-ordre` | Cherche ce qui se passe en premier, puis ensuite, puis à la fin. Les petits mots comme d'abord, puis et enfin t'aident à trouver l'ordre. | `d061a2984c16506a.mp3` |
| `indice:fr-lecture-vraifaux` | Relis la phrase, puis cherche dans le texte si c'est pareil. Si le texte dit la même chose, c'est vrai. Si le texte dit le contraire, c'est faux. | `527bcc3e5a45f96f.mp3` |
| `indice:fr-lecture-sens-mot` | Relis toute la phrase où se trouve le mot. Les autres mots autour t'aident à deviner ce qu'il veut dire. | `129d5bad1aff8934.mp3` |

## Dictées (phrase par phrase) (202)

| Clé | Texte à dire | Nom de fichier |
|---|---|---|
| `dictee:2:s0` | Léa a rangé ses crayons dans la trousse. | `4738337724fbc678.mp3` |
| `dictee:2:s1` | Elle est contente de son travail. | `8ca467097e2b583f.mp3` |
| `dictee:3:s0` | Au port, les bateaux rentrent le soir. | `9fd55eeb0eb3b17c.mp3` |
| `dictee:3:s1` | Les mouettes volent au-dessus de l'eau. | `0224ea29703e920b.mp3` |
| `dictee:4:s0` | Sur la plage, le sable est doux. | `c87c6eea24e7707b.mp3` |
| `dictee:4:s1` | Je ramasse des coquillages avec ma sœur. | `f193054b6eb437d9.mp3` |
| `dictee:5:s0` | Papa lave la voiture. | `22be40ca88d30bea.mp3` |
| `dictee:5:s1` | Les enfants ont aidé à rincer le toit. | `1ac25c12f367e6c5.mp3` |
| `dictee:6:s0` | Dans le pré, les vaches mangent l'herbe. | `4e0e4feb08b95c3e.mp3` |
| `dictee:6:s1` | Un oiseau chante sur la branche. | `2fd3eae943733252.mp3` |
| `dictee:7:s0` | Nous allons à la piscine le mercredi. | `7f44dab0dacdee93.mp3` |
| `dictee:7:s1` | J'aime nager avec mes amis. | `0c00bf5dd89d8cb3.mp3` |
| `dictee:8:s0` | La princesse et le roi habitent le château. | `295dbb64f02a4475.mp3` |
| `dictee:8:s1` | Ils sont très gentils. | `1d9ab8381e098fa2.mp3` |
| `dictee:9:s0` | La fusée décolle vers les étoiles. | `6c2a79796bea2dc6.mp3` |
| `dictee:9:s1` | Les astronautes regardent la Terre de là-haut. | `cbb14ade2191e7e8.mp3` |
| `dictee:10:s0` | Les dinosaures vivaient il y a longtemps. | `ccedb74c0b342c16.mp3` |
| `dictee:10:s1` | On n'en voit plus dans la forêt. | `ce6f8484c6f345e8.mp3` |
| `dictee:11:s0` | Le boulanger a préparé ses petits pains. | `0e29398b09092b98.mp3` |
| `dictee:11:s1` | Ils sentent bon et sont encore chauds. | `1a633cddd18fb6db.mp3` |
| `dictee:12:s0` | Chaque élève sort ses cahiers. | `8559c757cfeee69b.mp3` |
| `dictee:12:s1` | Il range sa trousse à côté du livre. | `23b09712bc02ae2b.mp3` |
| `dictee:13:s0` | Les oiseaux ont fait un nid dans l'arbre. | `26bbf41b5926de4e.mp3` |
| `dictee:13:s1` | Ils protègent ses petits du vent. | `42cabe8c27fc1426.mp3` |
| `dictee:14:s0` | Le perroquet répète ce que dit le marin. | `7e147fa092d79317.mp3` |
| `dictee:14:s1` | Son plumage est vert et bleu. | `05751fe32ecf5204.mp3` |
| `dictee:15:s0` | Maman range ses clés dans le tiroir. | `e4fcd34f60ec06eb.mp3` |
| `dictee:15:s1` | Elle se prépare à partir au marché. | `1610a7cbe2428003.mp3` |
| `dictee:16:s0` | Les feuilles tombent en automne. | `c8678fbfbdba727b.mp3` |
| `dictee:16:s1` | Les enfants sautent dans les tas de feuilles. | `6e559f944fc132af.mp3` |
| `dictee:17:s0` | Les joueurs courent sur le terrain. | `00f48a983169c1c1.mp3` |
| `dictee:17:s1` | Ils ont gagné le match à la fin. | `9333c2d4ab6562fd.mp3` |
| `dictee:18:s0` | Les pêcheurs rentrent au port. | `f10a35c5396955ba.mp3` |
| `dictee:18:s1` | Leurs filets sont pleins de poissons argentés. | `5f8ee4c716e62ec3.mp3` |
| `dictee:19:s0` | Le chevalier monte sur son cheval. | `8f9fdbf8d3658925.mp3` |
| `dictee:19:s1` | Les gardes ouvrent la porte et le roi salue ses amis. | `05a9f04cbb508ce7.mp3` |
| `dictee:20:s0` | Les astronautes flottent dans la station. | `f263ee9185a214bf.mp3` |
| `dictee:20:s1` | On regarde la Terre à travers le hublot. | `ffa75467f4249c90.mp3` |
| `dictee:21:s0` | Dans la forêt, les grands arbres cachent le ciel. | `2b982b91682c5914.mp3` |
| `dictee:21:s1` | Les oiseaux chantent et le ruisseau coule doucement. | `f106d0f6ceb4fdbd.mp3` |
| `dictee:22:s0` | Le marchand vend des fromages et des pommes rouges. | `2edda3764587e729.mp3` |
| `dictee:22:s1` | Les clients achètent leur déjeuner. | `805c3883685e1b77.mp3` |
| `dictee:23:s0` | Les enfants vont chanter une chanson. | `8c9e40c24ec20a07.mp3` |
| `dictee:23:s1` | La maîtresse veut les féliciter pour leur travail. | `7228a27a5b7d2c77.mp3` |
| `dictee:24:s0` | Je range ma chambre avant le dîner. | `511a446c9247cf8b.mp3` |
| `dictee:24:s1` | Mon petit frère porte son tambour dans le salon. | `beaf02186310818f.mp3` |
| `dictee:25:s0` | Les tortues nagent près du récif. | `dc72dac16a8e5b87.mp3` |
| `dictee:25:s1` | Elles cherchent des petits poissons à manger. | `d08b386f7a7591f0.mp3` |
| `dictee:26:s0` | Après le match, les joueurs sont fatigués. | `6eb650e7c6fb7143.mp3` |
| `dictee:26:s1` | Ils vont se doucher et rentrer à la maison. | `4fd2e9a05d8e7860.mp3` |
| `dictee:27:s0` | Les dinosaures courent vers la rivière. | `e1110f9d63a117ad.mp3` |
| `dictee:27:s1` | Leurs petits les suivent sur le chemin boueux. | `7976776ecb01c52d.mp3` |
| `dictee:28:s0` | La fée agite sa baguette. | `fc010a7906f18106.mp3` |
| `dictee:28:s1` | Des étoiles dorées tombent du ciel et touchent le sol. | `6e0970c058a68093.mp3` |
| `dictee:29:s0` | Les robots explorent la planète rouge. | `20905805db815c44.mp3` |
| `dictee:29:s1` | Ils envoient des photos à la station spatiale. | `394dcd947bfee7bf.mp3` |
| `dictee:30:s0` | Les crêpes sont délicieuses. | `dfaeaf9fc87690b5.mp3` |
| `dictee:30:s1` | Grand-mère va en préparer encore pour les voisins ce soir. | `2f6fa22917a1bee8.mp3` |
| `dictee:31:s0` | Pendant la récréation, les enfants jouent ensemble. | `6d91073cb07383e2.mp3` |
| `dictee:31:s1` | Ils se racontent des histoires drôles. | `2fbd0999117759af.mp3` |
| `dictee:32:s0` | Le soir, toute la famille se retrouve à table. | `836181ca233ce146.mp3` |
| `dictee:32:s1` | On parle de notre journée et on rit. | `fde7a3ba3f1ada64.mp3` |
| `dictee:33:s0` | Au printemps, les abeilles butinent les fleurs. | `56f1d4d5a5382ea6.mp3` |
| `dictee:33:s1` | Elles rapportent le pollen dans leur ruche dorée. | `3c08cf97ffc9c932.mp3` |
| `dictee:34:s0` | La mer est calme ce matin. | `6d2eee40754b1b43.mp3` |
| `dictee:34:s1` | Les dauphins sautent hors de l'eau et sont suivis par les oiseaux. | `66806128e32ca407.mp3` |
| `dictee:35:s0` | Le petit dinosaure cherche sa maman. | `02afdf636a87399f.mp3` |
| `dictee:35:s1` | Il la retrouve près du lac et ils mangent des feuilles tendres. | `8bb1669336f4d7b1.mp3` |
| `dictee:36:s0` | Le magicien prépare une potion étrange. | `061035a08d525e16.mp3` |
| `dictee:36:s1` | Il mélange des plantes, de l'eau et des poudres colorées avec soin. | `bee49d0783c5cb6f.mp3` |
| `dictee:37:s0` | Les scientifiques observent une comète. | `045dd89d718927c1.mp3` |
| `dictee:37:s1` | Elle passe vite et impressionne tout le monde à la station. | `943b8127e3506cca.mp3` |
| `dictee:38:s0` | Le coureur arrive le premier. | `8d2028f05f302b08.mp3` |
| `dictee:38:s1` | La foule applaudit et crie son nom. | `21a04b28a6610b05.mp3` |
| `dictee:38:s2` | Il lève les bras, heureux et fier de lui. | `a5b09f8274672a1c.mp3` |
| `dictee:39:s0` | Au marché, les odeurs sont délicieuses. | `9f69b0a298c03c37.mp3` |
| `dictee:39:s1` | Le pâtissier dispose ses gâteaux et les clients se pressent pour manger les tartes. | `e94d5384dabacf14.mp3` |
| `dictee:40:s0` | Dans la ferme, le fermier nourrit ses animaux. | `d788d2f3b73134f1.mp3` |
| `dictee:40:s1` | Les poules picorent et les vaches broutent. | `a0c4c9d7979dd05a.mp3` |
| `dictee:40:s2` | Tout le monde est calme ce matin. | `ea9c2db9bf254467.mp3` |
| `dictee:101:s0` | Dans la ferme, les poules picorent le grain. | `5d7105ffdf61cfc1.mp3` |
| `dictee:101:s1` | Le chien garde les moutons toute la journée. | `b560907d395daa9b.mp3` |
| `dictee:102:s0` | À l'école, les enfants rangent leur cartable. | `cc2e91d8489223b1.mp3` |
| `dictee:102:s1` | La maîtresse distribue des cahiers neufs. | `51614c7d541e7ca0.mp3` |
| `dictee:103:s0` | Le soir, toute la famille range la cuisine. | `90976b81eeef9491.mp3` |
| `dictee:103:s1` | Les assiettes sont propres après le repas. | `a95ca8d3501b9409.mp3` |
| `dictee:105:s0` | Chaque mercredi, nous allons à la piscine avec la classe. | `07ed3e114890384e.mp3` |
| `dictee:105:s1` | Après l'entraînement, le groupe retourne à l'école. | `c4e1747cc36f84d0.mp3` |
| `dictee:106:s0` | Au port, le pêcheur donne du pain à son chien. | `b50ea7d5891d2ed7.mp3` |
| `dictee:106:s1` | Il pense à la mer avant de partir en bateau. | `7305fd7afa5e8e1f.mp3` |
| `dictee:107:s0` | Sur l'île, le soleil est chaud toute la journée. | `94cbef5c471baee3.mp3` |
| `dictee:107:s1` | Le sable est fin sous les pieds. | `657efcb39ce83bd5.mp3` |
| `dictee:107:s2` | Les enfants nagent dans la mer bleue. | `02b38aa7460707fa.mp3` |
| `dictee:108:s0` | Dans la fusée, l'astronaute est calme avant le décollage. | `2a53361b796a5dff.mp3` |
| `dictee:108:s1` | La mission est importante pour toute l'équipe. | `a01911931187cf4f.mp3` |
| `dictee:109:s0` | Dans le château, le roi bat le tambour pour annoncer la fête. | `8b7ef98cbee9bdd7.mp3` |
| `dictee:109:s1` | Toute la cour trouve ce moment très important. | `7b8685306dc7b705.mp3` |
| `dictee:110:s0` | Le petit dinosaure traverse la plaine en courant. | `810c13dead97fc55.mp3` |
| `dictee:110:s1` | Il veut combler son ventre vide avant la nuit. | `0d4bc17cf66cdd54.mp3` |
| `dictee:110:s2` | Ses pas laissent une empreinte énorme dans la terre molle. | `7e22946a7c894619.mp3` |
| `dictee:111:s0` | Le pâtissier sort ses gâteaux tout chauds du four. | `9c8bb2d93aaf60ab.mp3` |
| `dictee:111:s1` | Il pose ses mains pleines de farine sur le comptoir avant de servir les clients. | `029e19a3a9bf86c5.mp3` |
| `dictee:112:s0` | Le renard cache ses provisions sous les feuilles avant l'hiver. | `6c3b5f4324015ab9.mp3` |
| `dictee:112:s1` | Il surveille ses petits avec attention pendant qu'ils jouent. | `abcbb649af59c014.mp3` |
| `dictee:113:s0` | Pendant la récréation, les élèves ont organise un grand jeu de ballon. | `2fa5d1ee58ca32c1.mp3` |
| `dictee:113:s1` | Ils ont couru dans toute la cour en riant. | `9337956c9c6b46dd.mp3` |
| `dictee:114:s0` | Les enfants ont range leurs jouets. | `9e76c9e91493214d.mp3` |
| `dictee:114:s1` | Après le repas, ils ont aide maman à débarrasser la table. | `f2c7e18a5eec19f4.mp3` |
| `dictee:114:s2` | Ensuite, on allume la télévision ensemble. | `19ceea077702dfa0.mp3` |
| `dictee:115:s0` | Au printemps, les fleurs poussent dans le jardin. | `fdcab8be428bac99.mp3` |
| `dictee:115:s1` | Les papillons volent autour des roses colorées. | `173055cdf0a9913b.mp3` |
| `dictee:116:s0` | Sur le terrain, les joueurs courent vers le ballon. | `338da8490637e52c.mp3` |
| `dictee:116:s1` | Les supporters chantent une chanson joyeuse dans les tribunes. | `c5bdc89264f1e35f.mp3` |
| `dictee:117:s0` | Le pêcheur se prépare avant de partir en mer. | `f2f5022ceeed9d3f.mp3` |
| `dictee:117:s1` | Il se lève tôt chaque matin pour attraper les poissons. | `631cd0482d7515c4.mp3` |
| `dictee:118:s0` | Le crabe se cache sous le sable chaud. | `fe4120786f26d8d5.mp3` |
| `dictee:118:s1` | Les enfants se baignent dans une eau turquoise et claire. | `29686ca143d45aeb.mp3` |
| `dictee:119:s0` | Dans la station, les astronautes portent une combinaison blanche. | `abdf287d412648db.mp3` |
| `dictee:119:s1` | Ils installent des antennes puissantes sur le toit. | `7d94dac8632e74d4.mp3` |
| `dictee:120:s0` | Dans le château, la reine porte une robe dorée. | `1fc7529c56c79574.mp3` |
| `dictee:120:s1` | Les chevaliers portent des armures brillantes au soleil. | `164f32e387be3394.mp3` |
| `dictee:121:s0` | Dans la vallée, les animaux géants se déplacent lentement entre les rochers. | `3e03f5420b412c13.mp3` |
| `dictee:121:s1` | Ils mangent des végétaux verts toute la journée. | `3e8d4c53214a36ab.mp3` |
| `dictee:122:s0` | Au marché, le boulanger range ses journaux du matin près de la caisse. | `d884b36af82a48ca.mp3` |
| `dictee:122:s1` | Dans la vitrine, des bocaux de confiture brillent au soleil. | `3e72b533691c079c.mp3` |
| `dictee:123:s0` | Le matin, le fermier part travailler aux champs après avoir nourri les poules. | `f5e197850dbfced4.mp3` |
| `dictee:123:s1` | Le soir, il faut encore donner à manger aux lapins avant la nuit. | `3df084eef8309fd3.mp3` |
| `dictee:124:s0` | À la fin du cours, la maîtresse demande de ranger les cahiers et d'écouter la consigne pour avancer dans l'exercice. | `ffd1d661500e000f.mp3` |
| `dictee:124:s1` | Les élèves doivent chanter puis réciter un poème devant la classe. | `483458ffffea9d41.mp3` |
| `dictee:125:s0` | Le matin, papa prépare le petit-déjeuner et maman part à son travail. | `9da1d4ac8d5b2be1.mp3` |
| `dictee:125:s1` | La maison est calme avant le réveil des enfants. | `a7cb8261ff9f1592.mp3` |
| `dictee:126:s0` | Au bord de la rivière, le héron reste immobile et attend à côté des roseaux. | `b91e901213e904b8.mp3` |
| `dictee:126:s1` | L'eau est fraîche sous les nénuphars. | `a70fd24e559402a5.mp3` |
| `dictee:127:s0` | Après l'entraînement, le coach range ses ballons dans le local. | `793567ecb9d50f53.mp3` |
| `dictee:127:s1` | Les joueurs sont fatigués mais contents de leur match. | `eb875daee25c12bd.mp3` |
| `dictee:128:s0` | Le marin range ses filets avant la tempête. | `6334ad931f6e3d7e.mp3` |
| `dictee:128:s1` | Les vagues sont hautes et le vent souffle fort sur le port. | `9f47f77a7a89708e.mp3` |
| `dictee:129:s0` | Sur la plage, les enfants construisent des châteaux de sable avant la marée. | `1d75c85d86065376.mp3` |
| `dictee:129:s1` | Les vagues arrivent doucement et effacent leurs traces. | `c519b1cff7dcb217.mp3` |
| `dictee:130:s0` | Dans la station, les écrans affichent plein de données. | `4583b11d7ba6706b.mp3` |
| `dictee:130:s1` | Les robots avancent lentement et réparent les panneaux solaires. | `a8a13f04197fbc17.mp3` |
| `dictee:131:s0` | Dans le royaume, les tours sont hautes et les jardins sont immenses. | `c4e39a94c99392b4.mp3` |
| `dictee:131:s1` | Une licorne blanche traverse la forêt enchantée. | `e2c44dbc1779d6aa.mp3` |
| `dictee:131:s2` | Les fleurs sont parfumées partout. | `3b8a7787f7d878de.mp3` |
| `dictee:132:s0` | Dans la vallée, les montagnes sont hautes et les rivières sont profondes. | `c334a3b06df210b5.mp3` |
| `dictee:132:s1` | Un volcan actif crache une fumée noire. | `e71dc0b09c360b5d.mp3` |
| `dictee:132:s2` | Les plantes sont immenses près du cratère. | `c0d9a16c085e00b4.mp3` |
| `dictee:133:s0` | Le chocolatier prépare un délicieux gâteau au citron pour la fête du village. | `0f4e69d149773593.mp3` |
| `dictee:133:s1` | Il doit combiner le sucre et le beurre avant d'enfourner la pâte, puis ranger ses nombreux outils de cuisine. | `be6618ac63034b6a.mp3` |
| `dictee:134:s0` | Le hérisson cherche une cachette importante pour hiberner avant l'arrivée du froid. | `c63fefc28e180cf4.mp3` |
| `dictee:134:s1` | Ses petites pattes tambourinent doucement sur le sol avant qu'il ne s'endorme. | `a6c5545862a17a3f.mp3` |
| `dictee:135:s0` | Pendant la récréation, les élèves jouent à des jeux de ballon dans la cour. | `7f7d14239a72e017.mp3` |
| `dictee:135:s1` | Ils rangent ensuite leurs chapeaux sur le porte-manteau avant de rentrer en classe. | `bf2f92d0b807f1d6.mp3` |
| `dictee:136:s0` | Dans le jardin, papa ramasse des cailloux près de l'allée. | `2e61c61f86be708d.mp3` |
| `dictee:136:s1` | Les enfants empilent des morceaux de bois pour construire une cabane. | `bb445cf6a72713ac.mp3` |
| `dictee:137:s0` | Dans la forêt, les gardes forestiers installent des signaux le long du sentier. | `1dfd128807e14010.mp3` |
| `dictee:137:s1` | Près de la rivière, plusieurs canaux traversent la vallée verdoyante. | `58196083b279e438.mp3` |
| `dictee:138:s0` | Au centre équestre, les enfants brossent les chevaux avant la compétition. | `47e7b2010c523104.mp3` |
| `dictee:138:s1` | Après la course, on affiche les résultats dans les journaux du club. | `df5be6d9703c4ce0.mp3` |
| `dictee:139:s0` | Au port, les pêcheurs rentrent avec leur filets pleins de poissons. | `1fdd26cc5422b9fc.mp3` |
| `dictee:139:s1` | Ils sont fatigués mais contents de leur journée en mer. | `340b02b63abe14c9.mp3` |
| `dictee:140:s0` | Sur la plage, les enfants jouent avec le sable fin. | `42a885760a99cff4.mp3` |
| `dictee:140:s1` | Ils vont nager dans une eau turquoise à côté des rochers. | `eec595efd30e4221.mp3` |
| `dictee:141:s0` | L'équipage prépare le vaisseau avant le grand départ vers Mars. | `255c553f3809c681.mp3` |
| `dictee:141:s1` | Chacun doit vérifier son matériel puis se préparer pour le voyage le plus important de sa vie. | `274a9ed09fd67728.mp3` |
| `dictee:142:s0` | Le jeune magicien s'entraîne chaque jour dans la tour du château. | `71899a447d97fb2b.mp3` |
| `dictee:142:s1` | Il espère réussir à maîtriser le sortilège avant de partir affronter le grand dragon des montagnes. | `3d6b65c83b7ff916.mp3` |
| `dictee:143:s0` | Le jeune dinosaure explore chaque jour un peu plus loin de son nid. | `497c369adc86b355.mp3` |
| `dictee:143:s1` | Le soir, il se couche contre sa mère pour dormir au chaud. | `b4b399cde1d7766a.mp3` |
| `dictee:144:s0` | Le fromager prépare son étal avant l'ouverture du marché. | `d0c118e89868dd72.mp3` |
| `dictee:144:s1` | Chaque matin, il se lève très tôt pour choisir les meilleurs fromages de la région. | `8e7ab8ec1fa08510.mp3` |
| `dictee:145:s0` | Au fond de l'étang, les grenouilles chantent dès la tombée de la nuit. | `fe8cf06718a82af6.mp3` |
| `dictee:145:s1` | Leur chant résonne longtemps dans l'air frais et humide de la soirée tranquille, apaisant ainsi toute la campagne silencieuse. | `4a8e29b61b4832d5.mp3` |
| `dictee:146:s0` | Pendant la sortie scolaire, la classe visite un grand musée rempli de tableaux anciens. | `7367700639ce55de.mp3` |
| `dictee:146:s1` | La maîtresse explique chaque oeuvre avec une patience admirable, sous le regard attentif des élèves curieux et silencieux. | `bedfaeacfd7bcff8.mp3` |
| `dictee:147:s0` | Chaque dimanche, toute la famille se réunit autour d'un grand repas préparé avec soin. | `59381d1eb517ea6f.mp3` |
| `dictee:147:s1` | Les enfants, impatients, attendent déjà le dessert promis par leur grand-mère. | `da02f87cca2f1e8b.mp3` |
| `dictee:148:s0` | Le long du chemin forestier, de grands chênes centenaires bordent le sentier silencieux. | `348589f4d14990f1.mp3` |
| `dictee:148:s1` | Leurs feuilles, agitées par le vent léger, bruissent doucement au-dessus des promeneurs. | `dd071d13d9b8de09.mp3` |
| `dictee:149:s0` | Après un match très disputé, les deux équipes quittent le terrain sous les applaudissements du public conquis. | `7feb742238c4e494.mp3` |
| `dictee:149:s1` | Les joueurs, épuisés mais heureux, sont accueillis par leurs familles à la sortie du stade. | `889f14c594aaec28.mp3` |
| `dictee:150:s0` | Chaque année, les habitants du village préparent une grande fête pour célébrer la mer et les marins disparus. | `9241b573c186da36.mp3` |
| `dictee:150:s1` | Les lanternes, allumées dès la nuit tombée, sont déposées sur l'eau par les enfants. | `cc969286c76a7164.mp3` |
| `dictee:151:s0` | Au large de l'île, les pêcheurs remontent leurs filets remplis de poissons multicolores. | `958519cab9d01f9d.mp3` |
| `dictee:151:s1` | Non loin de là, sur les récifs, de magnifiques coraux abritent une multitude de petites créatures marines. | `a1e20d62dfa79d8b.mp3` |
| `dictee:152:s0` | Dans le laboratoire de la station spatiale, les scientifiques analysent des échantillons rapportés de la Lune. | `d9238782925b7327.mp3` |
| `dictee:152:s1` | Sur les écrans, plusieurs signaux clignotent doucement pendant toute l'analyse. | `63115fecdba20e7b.mp3` |
| `dictee:153:s0` | Dans la grande salle du château, le roi et la reine accueillent leurs invités avec joie. | `87245b09bc46e504.mp3` |
| `dictee:153:s1` | Ce soir-là, tout le royaume est réuni pour célébrer la naissance du jeune prince, et les musiciens ont déjà commence à jouer. | `f8f67f04490d1ccc.mp3` |
| `dictee:154:s0` | Au bord du grand lac, plusieurs dinosaures viennent boire chaque matin avant la chaleur du jour. | `8e21ab5a64f65911.mp3` |
| `dictee:154:s1` | Ils sont parfois rejoints par de petits dinosaures curieux qui s'approchent doucement à pas feutrés. | `b63893509f11c940.mp3` |
| `dictee:155:s0` | Tous les samedis matin, le petit marché du village s'installe sur la place principale, entre la boulangerie et l'ancienne fontaine de pierre. | `ab48059c14a055aa.mp3` |
| `dictee:155:s1` | Les étals colorés, chargés de fruits et de légumes frais, attirent une foule nombreuse et joyeuse. | `e91b0512338fc9ae.mp3` |
| `dictee:156:s0` | Dans la basse-cour, les poules picorent tranquillement les graines éparpillées par le fermier chaque matin. | `c575a533f71f9b39.mp3` |
| `dictee:156:s1` | Le coq, perché sur la vieille barrière de bois, observe la scène d'un air fier et attentif. | `7d19c0092e84f4c1.mp3` |
| `dictee:157:s0` | À la bibliothèque de l'école, de nombreux livres racontent des histoires venues du monde entier. | `40220a2915accd52.mp3` |
| `dictee:157:s1` | Chaque vendredi, les élèves les plus curieux choisissent une nouvelle lecture et repartent avec un sourire satisfait. | `36d9f5c6be057a12.mp3` |
| `dictee:158:s0` | Le dimanche après-midi, quand la pluie tombe sans arrêt sur le toit de la maison, les enfants sortent leurs jeux préférés et s'installent tranquillement dans le salon pour jouer ensemble. | `92feb6fddea0689f.mp3` |
| `dictee:159:s0` | Au coeur de la forêt, les grands chênes centenaires abritent de nombreux animaux discrets. | `153a46233d6735ba.mp3` |
| `dictee:159:s1` | Le matin, la brume enveloppe doucement le sous-bois et les oiseaux sont déjà réveillés, chantant pour accueillir le jour nouveau. | `b32d5ce59a52ce38.mp3` |
| `dictee:160:s0` | Avant la compétition, les jeunes gymnastes s'entraînent chaque jour avec leur entraîneuse pour progresser rapidement. | `211f44ca1c15860d.mp3` |
| `dictee:160:s1` | Ils doivent encore travailler leur équilibre, et plusieurs signaux du jury indiquent déjà que la finale approche, mais ils restent concentrés malgré la pression. | `17b609fa109065f9.mp3` |
