// ============================================================
//  قاعدة البيانات — جميع أقسام الشرطة بإحداثياتها التقريبية
// ============================================================
const policeStations = [
  // ─── القاهرة ───
  { id: "New Capital City",      name: "العاصمة الإدارية الجديدة",  lat: 30.0131, lng: 31.7347 },
  { id: "101_Qism Al Tebin",     name: "قسم التبين",                lat: 29.8100, lng: 31.2820 },
  { id: "102_Qism Helwan",       name: "قسم حلوان",                 lat: 29.8503, lng: 31.3340 },
  { id: "103_Qism Al Maasara",   name: "قسم المعصرة",               lat: 29.8800, lng: 31.3100 },
  { id: "104_Qism 15 May",       name: "قسم 15 مايو",               lat: 29.9100, lng: 31.3500 },
  { id: "105_Qism Tora",         name: "قسم طرة",                   lat: 29.9400, lng: 31.2980 },
  { id: "106_Qism Al Maadi",     name: "قسم المعادي",               lat: 29.9617, lng: 31.2570 },
  { id: "107_Qism Al Basatin",   name: "قسم البساتين",              lat: 29.9914, lng: 31.2700 },
  { id: "108_Qism Dar Al Salam", name: "قسم دار السلام",            lat: 30.0050, lng: 31.2480 },
  { id: "109_Qism Masr Al Adema",name: "قسم مصر القديمة",           lat: 30.0058, lng: 31.2290 },
  { id: "110_Qism Al Sayeda Zainab", name: "قسم السيدة زينب",       lat: 30.0270, lng: 31.2380 },
  { id: "111_Qism Al Khalefa",   name: "قسم الخليفة",               lat: 30.0180, lng: 31.2440 },
  { id: "112_Qism Al Mokattam",  name: "قسم المقطم",                lat: 30.0250, lng: 31.2780 },
  { id: "113_Qism Monshaat Nasr",name: "قسم منشأة ناصر",            lat: 30.0400, lng: 31.2900 },
  { id: "114_Qism Al Darb Al Ahmar", name: "قسم الدرب الأحمر",      lat: 30.0390, lng: 31.2510 },
  { id: "115_Qism Al Mosky",     name: "قسم الموسكي",               lat: 30.0520, lng: 31.2540 },
  { id: "116_Qism Abdeen",       name: "قسم عابدين",                lat: 30.0450, lng: 31.2400 },
  { id: "117_Qism Kasr Al Nile", name: "قسم قصر النيل",             lat: 30.0490, lng: 31.2330 },
  { id: "118_Qism Al Zamalek",   name: "قسم الزمالك",               lat: 30.0658, lng: 31.2220 },
  { id: "119_Qism Boulak",       name: "قسم بولاق",                  lat: 30.0570, lng: 31.2300 },
  { id: "120_Qism Al Azbakeya",  name: "قسم الأزبكية",              lat: 30.0590, lng: 31.2460 },
  { id: "121_Qism Bab Al Shaareya", name: "قسم باب الشعرية",        lat: 30.0660, lng: 31.2570 },
  { id: "122_Qism Al Gamaleya",  name: "قسم الجمالية",              lat: 30.0680, lng: 31.2620 },
  { id: "123_Qism Al Daher",     name: "قسم الظاهر",                lat: 30.0700, lng: 31.2680 },
  { id: "124_Qism Al Waily",     name: "قسم الوايلي",               lat: 30.0790, lng: 31.2770 },
  { id: "125_Qism Hadayek Al Kobba", name: "قسم حدائق القبة",       lat: 30.0920, lng: 31.2870 },
  { id: "126_Qism Al Sharabeya", name: "قسم الشرابية",              lat: 30.1020, lng: 31.2760 },
  { id: "127_Qism Shoubra",      name: "قسم شبرا",                   lat: 30.0980, lng: 31.2460 },
  { id: "128_Qism Rod Al Farag", name: "قسم روض الفرج",             lat: 30.1050, lng: 31.2390 },
  { id: "129_Qism Al Sahel",     name: "قسم الساحل",                lat: 30.1120, lng: 31.2320 },
  { id: "130_Qism Al Zawya Al Hamra", name: "قسم الزاوية الحمراء",  lat: 30.1180, lng: 31.2780 },
  { id: "131_Qism Al Amereya",   name: "قسم الأميرية",              lat: 30.0850, lng: 31.3100 },
  { id: "132_Qism Al Zayton",    name: "قسم الزيتون",               lat: 30.0940, lng: 31.3200 },
  { id: "133_Qism Al Matareya",  name: "قسم المطرية",               lat: 30.1270, lng: 31.3110 },
  { id: "134_Qism Ain Shams",    name: "قسم عين شمس",               lat: 30.1250, lng: 31.3260 },
  { id: "135_Qism Al Marg",      name: "قسم المرج",                  lat: 30.1480, lng: 31.3480 },
  { id: "136_Qism Awal Al Salam",name: "قسم أول السلام",            lat: 30.1360, lng: 31.3650 },
  { id: "137_Qism Tany Al Salam",name: "قسم ثاني السلام",           lat: 30.1420, lng: 31.3780 },
  { id: "138_Qism Al Nozha",     name: "قسم النزهة",                lat: 30.1060, lng: 31.3420 },
  { id: "141_Qism Tany Madinet Nasr", name: "قسم ثاني مدينة نصر",   lat: 30.0600, lng: 31.3280 },
  { id: "142_Qism Awal Al Qahera Al Gadeda", name: "قسم أول القاهرة الجديدة", lat: 30.0200, lng: 31.4790 },
  { id: "143_Qism Tany Al Qahera Al Gadeda", name: "قسم ثاني القاهرة الجديدة", lat: 30.0280, lng: 31.5000 },
  { id: "144_Qism Talet Al Qahera Al Gadeda", name: "قسم ثالث القاهرة الجديدة", lat: 30.0350, lng: 31.5200 },
  { id: "145_Qism Al Shorouk",   name: "قسم الشروق",                lat: 30.1110, lng: 31.6090 },
  { id: "146_Qism Badr",         name: "قسم بدر",                    lat: 30.1280, lng: 31.7240 },
  { id: "199_Desert Side Cairo", name: "الجهة الصحراوية — القاهرة",  lat: 30.0500, lng: 31.1500 },

  // ─── الإسكندرية ───
  { id: "201_Qism Awal Al Montazah", name: "قسم أول المنتزه",       lat: 31.2870, lng: 29.9940 },
  { id: "202_Qism Tany Al Montazah", name: "قسم ثاني المنتزه",      lat: 31.3000, lng: 30.0100 },
  { id: "203_Qism Awal Al Raml", name: "قسم أول الرمل",             lat: 31.2020, lng: 29.9110 },
  { id: "204_Qism Tany Al Raml", name: "قسم ثاني الرمل",            lat: 31.1980, lng: 29.9050 },
  { id: "205_Qism Sidi Gaber",   name: "قسم سيدي جابر",             lat: 31.2240, lng: 29.9460 },
  { id: "206_Qism Bab Sharqi",   name: "قسم باب شرقي",              lat: 31.2010, lng: 29.9220 },
  { id: "207_Qism Al Atareen",   name: "قسم العطارين",              lat: 31.1960, lng: 29.9030 },
  { id: "208_Qism Moharam Bek",  name: "قسم محرم بك",               lat: 31.1870, lng: 29.9100 },
  { id: "209_Qism Karmouz",      name: "قسم كرموز",                  lat: 31.1800, lng: 29.8900 },
  { id: "210_Qism Al Laban",     name: "قسم اللبان",                 lat: 31.1720, lng: 29.8780 },
  { id: "211_Qism Al Manshya",   name: "قسم المنشية",                lat: 31.1990, lng: 29.8990 },
  { id: "212_Qism Al Gomrok",    name: "قسم الجمرك",                 lat: 31.2060, lng: 29.8920 },
  { id: "213_Qism Mina Al Basal",name: "قسم ميناء البصل",           lat: 31.1850, lng: 29.8700 },
  { id: "214_Qism Al Dekhela",   name: "قسم الدخيلة",               lat: 31.1640, lng: 29.8350 },
  { id: "215_Qism Awal Al Amerya", name: "قسم أول العامرية",        lat: 31.0730, lng: 29.7880 },
  { id: "216_Qism Tany Al Amerya", name: "قسم ثاني العامرية",       lat: 31.0600, lng: 29.7700 },
  { id: "217_Qism Borg Al Arab",  name: "قسم برج العرب",             lat: 30.9120, lng: 29.5520 },
  { id: "218_Borg Al Arab Al Gadeda City", name: "مدينة برج العرب الجديدة", lat: 30.8800, lng: 29.5100 },
  { id: "219_Qism Al Sahel Al Shamali Alex", name: "قسم الساحل الشمالي — إسكندرية", lat: 31.0500, lng: 29.3000 },

  // ─── بورسعيد ───
  { id: "301_QismAl Sharq",      name: "قسم الشرق",                  lat: 31.2706, lng: 32.3020 },
  { id: "302_Qism Al Arab",      name: "قسم العرب",                  lat: 31.2580, lng: 32.2900 },
  { id: "303_Qism Al Manakh",    name: "قسم المناخ",                  lat: 31.2450, lng: 32.2800 },
  { id: "304_Qism Al Dawahi",    name: "قسم الضواحي",                lat: 31.2200, lng: 32.2650 },
  { id: "305_Qism Al Zohour",    name: "قسم الزهور",                  lat: 31.2750, lng: 32.3200 },
  { id: "306_Qism Al Manasra",   name: "قسم المناصرة",               lat: 31.2820, lng: 32.3400 },
  { id: "307_Qism Awal Al Ganob",name: "قسم أول الجنوب",             lat: 31.2100, lng: 32.2400 },
  { id: "308_Qism Tany Al Ganoub",name: "قسم ثاني الجنوب",           lat: 31.2000, lng: 32.2300 },
  { id: "309_Qism Awal Port Fouad", name: "قسم أول بورفؤاد",         lat: 31.2560, lng: 32.3220 },
  { id: "310_Qism Tany Port Fouad", name: "قسم ثاني بورفؤاد",        lat: 31.2620, lng: 32.3300 },
  { id: "311_Qism Sharq Al Tafreaa", name: "قسم شرق التفريعة",       lat: 31.2880, lng: 32.3550 },
  { id: "312_Qism Al Daara Al Gomrokia", name: "قسم الدائرة الجمركية", lat: 31.2480, lng: 32.2860 },

  // ─── السويس ───
  { id: "401_Qism Al Suez",      name: "قسم السويس",                 lat: 29.9668, lng: 32.5498 },
  { id: "402_Qism Al Arbeen",    name: "قسم الأربعين",               lat: 29.9800, lng: 32.5200 },
  { id: "403_Qism Ataqa",        name: "قسم عتاقة",                  lat: 29.9400, lng: 32.4850 },
  { id: "404_Qism Faisal",       name: "قسم فيصل",                   lat: 29.9900, lng: 32.5550 },
  { id: "405_Qism Al Ganayen",   name: "قسم الجناين",                lat: 30.0050, lng: 32.5700 },
  { id: "499_Desert Side Suez",  name: "الجهة الصحراوية — السويس",    lat: 30.1000, lng: 32.3000 },

  // ─── دمياط ───
  { id: "1101_Qism Awal Dammietta", name: "قسم أول دمياط",          lat: 31.4165, lng: 31.8133 },
  { id: "1102_Qism Tany Dammietta", name: "قسم ثاني دمياط",         lat: 31.4100, lng: 31.8200 },
  { id: "1103_Markaz Damietta",  name: "مركز دمياط",                 lat: 31.3900, lng: 31.7900 },
  { id: "1104_Markaz Fraskour",  name: "مركز فارسكور",               lat: 31.3310, lng: 31.7160 },
  { id: "1105_Markaz Al Zarka",  name: "مركز الزرقا",                lat: 31.3580, lng: 31.8700 },
  { id: "1106_Markaz Kafr Saad", name: "مركز كفر سعد",               lat: 31.4500, lng: 31.7800 },
  { id: "1107_Markaz Kafr Al Bateekh", name: "مركز كفر البطيخ",      lat: 31.3700, lng: 31.8400 },
  { id: "1108_New Dameitta City",name: "مدينة دمياط الجديدة",        lat: 31.4800, lng: 31.8500 },
  { id: "1109_New Dameitta Port Police Station", name: "قسم ميناء دمياط الجديد", lat: 31.5000, lng: 31.9000 },
  { id: "1110_Qism Ras Al Bar",  name: "قسم رأس البر",               lat: 31.4840, lng: 31.8690 },
  { id: "1111_Qism Al Sro",      name: "قسم السرو",                  lat: 31.4300, lng: 31.8300 },

  // ─── الدقهلية ───
  { id: "1201_Qism Awal Al Mansoura", name: "قسم أول المنصورة",     lat: 31.0365, lng: 31.3807 },
  { id: "1202_Qism Tany Al Mansoura", name: "قسم ثاني المنصورة",    lat: 31.0420, lng: 31.3900 },
  { id: "1203_Markaz Al Mansoura",name: "مركز المنصورة",             lat: 31.0200, lng: 31.3600 },
  { id: "1204_Markaz Aga",       name: "مركز أجا",                   lat: 30.9240, lng: 31.3730 },
  { id: "1205_Qism Met Ghamr",   name: "قسم ميت غمر",               lat: 30.7230, lng: 31.2580 },
  { id: "1206_Markaz Mit Ghamr", name: "مركز ميت غمر",               lat: 30.7200, lng: 31.2500 },
  { id: "1207_Markaz Al Senbellawein", name: "مركز السنبلاوين",      lat: 30.8720, lng: 31.4790 },
  { id: "1208_Markaz Tamy Amded", name: "مركز تمي الأمديد",          lat: 30.9800, lng: 31.2800 },
  { id: "1209_Markaz Bani Abeed", name: "مركز بني عبيد",             lat: 31.0600, lng: 31.4500 },
  { id: "1210_Markaz Mahlet Demna", name: "مركز محلة دمنة",          lat: 31.0000, lng: 31.2100 },
  { id: "1211_Markaz Dekerness", name: "مركز دكرنس",                  lat: 31.0780, lng: 31.5980 },
  { id: "1212_Markaz Menyet Al Nasr", name: "مركز منية النصر",       lat: 31.1420, lng: 31.6020 },
  { id: "1213_Qism Al Kordy",    name: "قسم الكردي",                  lat: 31.0000, lng: 31.5000 },
  { id: "1214_Markaz Mit Selseel", name: "مركز ميت سلسيل",           lat: 31.1200, lng: 31.6400 },
  { id: "1215_Markaz Al Gamaleya", name: "مركز الجمالية",            lat: 31.1700, lng: 31.6800 },
  { id: "1216_Markaz Al Manzala", name: "مركز المنزلة",              lat: 31.1630, lng: 32.0080 },
  { id: "1217_Markaz Al Matareya", name: "مركز المطرية",             lat: 31.1840, lng: 32.0750 },
  { id: "1218_Markaz Sherbeen",  name: "مركز شربين",                  lat: 31.1910, lng: 31.5460 },
  { id: "1219_Qism Gamasa",      name: "قسم جمصة",                   lat: 31.2560, lng: 32.0280 },
  { id: "1220_Markaz Talkha",    name: "مركز طلخا",                   lat: 31.0590, lng: 31.3800 },
  { id: "1221_Markaz Nebroua",   name: "مركز نبروه",                  lat: 30.9700, lng: 31.3200 },
  { id: "1222_Markaz Belqas",    name: "مركز بلقاس",                  lat: 31.1630, lng: 31.4670 },

  // ─── الشرقية ───
  { id: "1301_Qism Awal Zagazig", name: "قسم أول الزقازيق",         lat: 30.5877, lng: 31.5020 },
  { id: "1302_Qism Tany Al Zagazig", name: "قسم ثاني الزقازيق",     lat: 30.5900, lng: 31.5100 },
  { id: "1303_Markaz Al Zagazig", name: "مركز الزقازيق",             lat: 30.5750, lng: 31.4900 },
  { id: "1304_Qism Al Qenayat",  name: "قسم القناطر",                lat: 30.6300, lng: 31.5600 },
  { id: "1305_Markaz Menya Al Qamh", name: "مركز منيا القمح",        lat: 30.5300, lng: 31.3400 },
  { id: "1306_Markaz Mashtoul Al Souq", name: "مركز مشتول السوق",    lat: 30.5900, lng: 31.6200 },
  { id: "1307_Markaz Belbes",    name: "مركز بلبيس",                  lat: 30.4250, lng: 31.5570 },
  { id: "1308_Qism Al Asher Mn Ramadan", name: "قسم العاشر من رمضان", lat: 30.2920, lng: 31.7450 },
  { id: "1309_Qism Tany Madint Al Asher Mn Ramadan", name: "قسم ثاني العاشر من رمضان", lat: 30.2990, lng: 31.7520 },
  { id: "1310_Markaz Abo Hammad", name: "مركز أبو حماد",             lat: 30.7220, lng: 31.6740 },
  { id: "1311_Markaz Hehya",     name: "مركز هيه",                    lat: 30.6620, lng: 31.5930 },
  { id: "1312_Markaz Dyarb Negm", name: "مركز ديارب نجم",            lat: 30.8600, lng: 31.5700 },
  { id: "1313_Markaz Al Ibrahimeya", name: "مركز الإبراهيمية",       lat: 30.7000, lng: 31.4500 },
  { id: "1314_Markaz Abo Kbeer", name: "مركز أبو كبير",              lat: 30.7240, lng: 31.6700 },
  { id: "1315_Markaz Kafr Sakr", name: "مركز كفر صقر",               lat: 30.8000, lng: 31.8600 },
  { id: "1316_Markaz Awlad Sakr", name: "مركز أولاد صقر",            lat: 30.7700, lng: 31.7400 },
  { id: "1317_Markaz San Al Hagar", name: "مركز صان الحجر",          lat: 30.9700, lng: 31.8800 },
  { id: "1318_Markaz Monshaat Abo omar", name: "مركز منشأة أبو عمر", lat: 30.7900, lng: 31.9500 },
  { id: "1319_Markaz Al Hasyneya", name: "مركز الحسينية",            lat: 30.7850, lng: 31.9080 },
  { id: "1320_Qism Faqous",      name: "قسم فاقوس",                  lat: 30.7290, lng: 31.8040 },
  { id: "1321_Markaz Faqous",    name: "مركز فاقوس",                  lat: 30.7250, lng: 31.7980 },
  { id: "1322_Qism Al Qoryen",   name: "قسم القرين",                  lat: 30.8300, lng: 32.1000 },
  { id: "1323_Qism Al Salheya Al Gadeda", name: "قسم الصالحية الجديدة", lat: 30.9450, lng: 32.3150 },

  // ─── القليوبية ───
  { id: "1401_Qism Awal Banha",  name: "قسم أول بنها",              lat: 30.4637, lng: 31.1800 },
  { id: "1402_Qism Tany Banha",  name: "قسم ثاني بنها",             lat: 30.4700, lng: 31.1880 },
  { id: "1403_Markaz Banha",     name: "مركز بنها",                   lat: 30.4600, lng: 31.1700 },
  { id: "1404_Markaz Kafr Shokr", name: "مركز كفر شكر",              lat: 30.5380, lng: 31.2680 },
  { id: "1405_Markaz Toukh",     name: "مركز طوخ",                   lat: 30.3650, lng: 31.2020 },
  { id: "1406_Qism Qaha",        name: "قسم قها",                    lat: 30.2860, lng: 31.2010 },
  { id: "1407_Markaz Al Qanater Al Khayreya", name: "مركز القناطر الخيرية", lat: 30.1960, lng: 31.1160 },
  { id: "1408_Qism Qalyoub",     name: "قسم قليوب",                  lat: 30.1820, lng: 31.2020 },
  { id: "1409_Markaz Qalyoub",   name: "مركز قليوب",                 lat: 30.1780, lng: 31.1980 },
  { id: "1410_Qism Awal Shoubra Khema", name: "قسم أول شبرا الخيمة", lat: 30.1250, lng: 31.2450 },
  { id: "1411_Qism Tany Shoubra Al Khema", name: "قسم ثاني شبرا الخيمة", lat: 30.1200, lng: 31.2500 },
  { id: "1412_Qism Al Khosous",  name: "قسم الخصوص",                 lat: 30.1680, lng: 31.3150 },
  { id: "1413_Markaz Shebeen Al Qanater", name: "مركز شبين القناطر",  lat: 30.3200, lng: 31.3100 },
  { id: "1414_Qism Khanka",      name: "قسم الخانكة",                lat: 30.2160, lng: 31.3730 },
  { id: "1415_Markaz Al khanka", name: "مركز الخانكة",               lat: 30.2200, lng: 31.3800 },
  { id: "1416_Qism Al Obour",    name: "قسم العبور",                  lat: 30.2140, lng: 31.4620 },

  // ─── كفر الشيخ ───
  { id: "1501_Qism Awal Kafr Al Sheikh", name: "قسم أول كفر الشيخ", lat: 31.1120, lng: 30.9400 },
  { id: "1502_Qism Tany Kafr Al sheikh", name: "قسم ثاني كفر الشيخ", lat: 31.1180, lng: 30.9460 },
  { id: "1503_Markaz Kafr Al Sheikh", name: "مركز كفر الشيخ",        lat: 31.1100, lng: 30.9350 },
  { id: "1504_Markaz Al Reyad",  name: "مركز الرياض",                 lat: 31.2200, lng: 31.0800 },
  { id: "1505_Markaz Al Hamoul", name: "مركز الحامول",                lat: 31.2020, lng: 30.7900 },
  { id: "1506_Qism Bella",       name: "قسم بلا",                    lat: 31.0720, lng: 30.8820 },
  { id: "1507_Markaz Beila",     name: "مركز بلا",                   lat: 31.0700, lng: 30.8800 },
  { id: "1508_Markaz Al Burlos", name: "مركز البرلس",                 lat: 31.2640, lng: 30.8620 },
  { id: "1509_Markaz Metobas",   name: "مركز مطوبس",                  lat: 31.1820, lng: 30.7820 },
  { id: "1510_Markaz Fowah",     name: "مركز فوه",                   lat: 31.1770, lng: 30.7100 },
  { id: "1511_Markaz Sidi Salem", name: "مركز سيدي سالم",            lat: 31.1140, lng: 30.7800 },
  { id: "1512_Qism Dessouk",     name: "قسم دسوق",                   lat: 31.1275, lng: 30.6441 },
  { id: "1513_Markaz Desouk",    name: "مركز دسوق",                  lat: 31.1250, lng: 30.6400 },
  { id: "1514_Markaz Qelin",     name: "مركز قلين",                   lat: 31.0600, lng: 30.8100 },

  // ─── الغربية ───
  { id: "1601_Qism Awal Tanta",  name: "قسم أول طنطا",              lat: 30.7876, lng: 31.0014 },
  { id: "1602_Qism Tany Tanta",  name: "قسم ثاني طنطا",             lat: 30.7920, lng: 31.0080 },
  { id: "1603_Markaz Tanta",     name: "مركز طنطا",                   lat: 30.7800, lng: 30.9900 },
  { id: "1604_Markaz Al Santa",  name: "مركز السنطة",                lat: 30.9280, lng: 30.9820 },
  { id: "1605_Markaz Zefta",     name: "مركز زفتى",                   lat: 30.7118, lng: 31.2440 },
  { id: "1606_Markaz Samannoud", name: "مركز سمنود",                  lat: 31.0230, lng: 31.2400 },
  { id: "1607_Qism Awal Al Mahala Al Kobra", name: "قسم أول المحلة الكبرى", lat: 30.9737, lng: 31.1637 },
  { id: "1608_Qism Tany Al Mahala Al Kobra", name: "قسم ثاني المحلة الكبرى", lat: 30.9800, lng: 31.1700 },
  { id: "1609_Qism Talet A Mahla Al Kobra", name: "قسم ثالث المحلة الكبرى", lat: 30.9850, lng: 31.1750 },
  { id: "1610_Markaz Al Mahla Al Kobra", name: "مركز المحلة الكبرى", lat: 30.9700, lng: 31.1600 },
  { id: "1611_Markaz Qotour",    name: "مركز قطور",                  lat: 30.8280, lng: 30.9040 },
  { id: "1612_Markaz Basioun",   name: "مركز بسيون",                  lat: 30.8780, lng: 30.9900 },
  { id: "1613_Markaz Kafr Al Zayat", name: "مركز كفر الزيات",        lat: 30.8190, lng: 30.8240 },
  { id: "1614_Qism Zefta",       name: "قسم زفتى",                   lat: 30.7120, lng: 31.2420 },

  // ─── المنوفية ───
  { id: "1701_Qism Shebeen Al Kom", name: "قسم شبين الكوم",          lat: 30.5194, lng: 30.9767 },
  { id: "1702_Markaz Shebeen Al Kom", name: "مركز شبين الكوم",       lat: 30.5150, lng: 30.9720 },
  { id: "1703_Markaz Al Shohada", name: "مركز الشهداء",              lat: 30.5450, lng: 31.0750 },
  { id: "1704_Markaz Tala",       name: "مركز تلا",                   lat: 30.6810, lng: 30.9120 },
  { id: "1705_Markaz Berket Al saba", name: "مركز بركة السبع",        lat: 30.5760, lng: 30.8390 },
  { id: "1706_Markaz Qewaisna",   name: "مركز قويسنا",                lat: 30.5640, lng: 31.0730 },
  { id: "1707_Markaz Al Bagour",  name: "مركز الباجور",               lat: 30.4310, lng: 30.9290 },
  { id: "1708_Markaz Ashmoun",    name: "مركز أشمون",                 lat: 30.2960, lng: 30.9810 },
  { id: "1709_Qism Sers Al Layan", name: "قسم سرس الليان",           lat: 30.4800, lng: 30.8500 },
  { id: "1710_Qism Menouf City",  name: "قسم مدينة منوف",            lat: 30.4670, lng: 30.9160 },
  { id: "1711_Markaz Menouf",     name: "مركز منوف",                  lat: 30.4650, lng: 30.9140 },
  { id: "1712_Markaz & Madinet Al Sadat", name: "مركز ومدينة السادات", lat: 30.4020, lng: 30.5270 },

  // ─── البحيرة ───
  { id: "1801_Qism Damanhour",   name: "قسم دمنهور",                 lat: 31.0359, lng: 30.4686 },
  { id: "1802_Markaz Damanhour", name: "مركز دمنهور",                 lat: 31.0300, lng: 30.4600 },
  { id: "1803_Markaz Housh Eissa", name: "مركز حوش عيسى",            lat: 31.0350, lng: 30.3100 },
  { id: "1804_Markaz Abo Al Matamir", name: "مركز أبو المطامير",     lat: 31.0140, lng: 30.2210 },
  { id: "1805_Qism Kafr Al Dawar", name: "قسم كفر الدوار",           lat: 31.1230, lng: 30.1290 },
  { id: "1806_Markaz Kafr Al Dawar", name: "مركز كفر الدوار",        lat: 31.1200, lng: 30.1260 },
  { id: "1807_Markaz Edko",      name: "مركز إدكو",                   lat: 31.2900, lng: 30.2800 },
  { id: "1808_Markaz Rahseed",   name: "مركز رشيد",                   lat: 31.4020, lng: 30.4160 },
  { id: "1809_Markaz Abo Hummus", name: "مركز أبو حمص",              lat: 30.9240, lng: 30.2640 },
  { id: "1810_Markaz Al Mahmoudeya", name: "مركز المحمودية",         lat: 30.8700, lng: 30.5300 },
  { id: "1811_Markaz Al Rahmanya", name: "مركز الرحمانية",           lat: 30.7550, lng: 30.6840 },
  { id: "1812_Markaz Shubrakhit", name: "مركز شبراخيت",              lat: 30.9970, lng: 30.6500 },
  { id: "1813_Markaz Etay Al Baroud", name: "مركز إيتاي البارود",    lat: 30.8720, lng: 30.6820 },
  { id: "1814_Markaz Kom Hamada", name: "مركز كوم حمادة",            lat: 30.7560, lng: 30.7820 },
  { id: "1815_Markaz Badr",      name: "مركز بدر",                   lat: 31.0000, lng: 30.1800 },
  { id: "1816_Markaz Al Delengat", name: "مركز الدلنجات",            lat: 30.8660, lng: 30.8380 },
  { id: "1817_Markaz Wadi Al Natron", name: "مركز وادي النطرون",     lat: 30.3830, lng: 30.3200 },
  { id: "1818_Qism Gharb Al Noubareya", name: "قسم غرب النوبارية",   lat: 30.5500, lng: 29.6500 },
  { id: "1899_Desert Side Beheira", name: "الجهة الصحراوية — البحيرة", lat: 30.7000, lng: 29.5000 },

  // ─── الإسماعيلية ───
  { id: "1901_Qism Awal",        name: "قسم الإسماعيلية أول",        lat: 30.5965, lng: 32.2720 },
  { id: "1902_Qism Tany",        name: "قسم الإسماعيلية ثاني",       lat: 30.6020, lng: 32.2780 },
  { id: "1903_Qism Talet",       name: "قسم الإسماعيلية ثالث",       lat: 30.6080, lng: 32.2850 },
  { id: "1904_Markaz Al Ismailia", name: "مركز الإسماعيلية",         lat: 30.5900, lng: 32.2600 },
  { id: "1905_Markaz Al Qantara Gharb", name: "مركز القنطرة غرب",    lat: 30.8350, lng: 32.3080 },
  { id: "1906_Markaz Al Qantara Sharq", name: "مركز القنطرة شرق",    lat: 30.8430, lng: 32.3260 },
  { id: "1907_Markaz Fayed",     name: "مركز فايد",                   lat: 30.3200, lng: 32.3500 },
  { id: "1908_Markaz Abo Soweir", name: "مركز أبو صوير",             lat: 30.5500, lng: 32.0800 },
  { id: "1909_Markaz Al Tal Al Kbeer", name: "مركز التل الكبير",     lat: 30.5600, lng: 32.0400 },
  { id: "1910_Markaz Al Qasasen Al Gadeda", name: "مركز القصاصين الجديدة", lat: 30.5300, lng: 31.9600 },
  { id: "1999_Khareg Al Zemam",  name: "خارج الزمام",                 lat: 30.5000, lng: 32.5000 },

  // ─── الجيزة ───
  { id: "2101_Qism Imbaba",      name: "قسم إمبابة",                  lat: 30.0740, lng: 31.2130 },
  { id: "2102_Qism Al Agouza",   name: "قسم العجوزة",                 lat: 30.0620, lng: 31.2120 },
  { id: "2103_Qism Al Dokki",    name: "قسم الدقي",                   lat: 30.0460, lng: 31.2010 },
  { id: "2104_Qism Al Giza",     name: "قسم الجيزة",                  lat: 30.0131, lng: 31.2089 },
  { id: "2105_Qism Bolak Al Dakrour", name: "قسم بولاق الدكرور",     lat: 30.0350, lng: 31.1980 },
  { id: "2106_Qism Al Omraneya", name: "قسم العمرانية",               lat: 29.9980, lng: 31.1820 },
  { id: "2107_Qism Al Talbeya",  name: "قسم الطالبية",                lat: 29.9810, lng: 31.1300 },
  { id: "2108_Qism Al Ahram",    name: "قسم الأهرام",                  lat: 29.9740, lng: 31.1440 },
  { id: "2109_Markaz Abo Al Nomros", name: "مركز أبو النمرس",         lat: 29.8730, lng: 31.1320 },
  { id: "2110_Qism Al Hawamedya", name: "قسم الحوامدية",              lat: 29.8580, lng: 31.2200 },
  { id: "2111_Markaz Badrasheen", name: "مركز بدرشين",                 lat: 29.8100, lng: 31.2000 },
  { id: "2112_Markaz Al Ayat",   name: "مركز العياط",                  lat: 29.6780, lng: 31.2320 },
  { id: "2113_Markaz Al Saf",    name: "مركز الصف",                   lat: 29.5690, lng: 31.2700 },
  { id: "2114_Markaz Atfeeh",    name: "مركز أطفيح",                   lat: 29.4200, lng: 31.2600 },
  { id: "2115_Markaz Kerdasa",   name: "مركز كرداسة",                  lat: 30.0180, lng: 31.1420 },
  { id: "2116_Markaz Oussim",    name: "مركز أوسيم",                   lat: 30.0520, lng: 31.1190 },
  { id: "2117_Qism Al Waraq",    name: "قسم الوراق",                   lat: 30.0820, lng: 31.2000 },
  { id: "2118_Markaz Monshaat Al Qanater", name: "مركز منشأة القناطر", lat: 29.9500, lng: 31.1100 },
  { id: "2119_Qism Al Sheikh Zayed", name: "قسم الشيخ زايد",          lat: 30.0380, lng: 30.9980 },
  { id: "2120_Qism Awl 6 Oct",   name: "قسم أول 6 أكتوبر",           lat: 29.9800, lng: 30.9550 },
  { id: "2121_Qism Tany 6 Oct",  name: "قسم ثاني 6 أكتوبر",          lat: 29.9720, lng: 30.9420 },
  { id: "2122_Qism Al Wahat Al Bahareya", name: "قسم الواحات البحرية", lat: 28.3580, lng: 28.8680 },
  { id: "2123_Qism Talet 6 Oct", name: "قسم ثالث 6 أكتوبر",          lat: 29.9650, lng: 30.9300 },
  { id: "2198_Desert Side Giza 1", name: "الجهة الصحراوية — الجيزة ١", lat: 29.5000, lng: 30.5000 },
  { id: "2199_Desert Side Giza 2", name: "الجهة الصحراوية — الجيزة ٢", lat: 30.2000, lng: 30.2000 },

  // ─── بني سويف ───
  { id: "2201_Qism Beni Suef",   name: "قسم بني سويف",               lat: 29.0744, lng: 31.0990 },
  { id: "2202_Markaz Bani Suef", name: "مركز بني سويف",               lat: 29.0700, lng: 31.0950 },
  { id: "2203_Qism Beni Suef Al Gadeda", name: "قسم بني سويف الجديدة", lat: 29.0900, lng: 31.1200 },
  { id: "2204_Markaz Ehnasia",   name: "مركز إهناسيا",                 lat: 29.0840, lng: 30.9300 },
  { id: "2205_Markaz Beba",      name: "مركز ببا",                    lat: 28.9800, lng: 30.9840 },
  { id: "2206_Markaz Samasta",   name: "مركز سمسطا",                  lat: 29.2000, lng: 31.0950 },
  { id: "2207_Markaz Al Fashn",  name: "مركز الفشن",                  lat: 28.8240, lng: 30.8940 },
  { id: "2208_Markaz Al Wasta",  name: "مركز الواسطى",                lat: 29.3300, lng: 31.2650 },
  { id: "2209_Markaz Nasir",     name: "مركز ناصر",                   lat: 29.5200, lng: 30.8600 },
  { id: "2299_Desert Side Beni Suef", name: "الجهة الصحراوية — بني سويف", lat: 29.2000, lng: 30.4000 },

  // ─── الفيوم ───
  { id: "2301_Qism Awal Al Fayoum", name: "قسم أول الفيوم",          lat: 29.3084, lng: 30.8428 },
  { id: "2302_Markaz Fayoum",    name: "مركز الفيوم",                  lat: 29.3000, lng: 30.8350 },
  { id: "2303_Markaz Tamia",     name: "مركز طامية",                   lat: 29.4550, lng: 30.9040 },
  { id: "2304_Markaz Senoures",  name: "مركز سنورس",                   lat: 29.3680, lng: 30.8700 },
  { id: "2305_Markaz Ebshway",   name: "مركز إبشواي",                  lat: 29.1960, lng: 30.6820 },
  { id: "2306_Markaz Etsa",      name: "مركز إطسا",                   lat: 29.2450, lng: 30.7490 },
  { id: "2307_Markaz Yousef Al sedik", name: "مركز يوسف الصديق",     lat: 29.1060, lng: 30.5700 },
  { id: "2308_Al Fayoum Al Gadeda City", name: "مدينة الفيوم الجديدة", lat: 29.3400, lng: 30.9000 },
  { id: "2309_Markaz Al Shawshna", name: "مركز الشوشنة",              lat: 29.5000, lng: 30.6500 },
  { id: "2310_Qism Tany Al Fayoum", name: "قسم ثاني الفيوم",         lat: 29.3150, lng: 30.8500 },
  { id: "2399_Desert Side Al Fayoum", name: "الجهة الصحراوية — الفيوم", lat: 29.0000, lng: 30.2000 },

  // ─── المنيا ───
  { id: "2401_Qism Awal Menya",  name: "قسم أول المنيا",              lat: 28.0939, lng: 30.7503 },
  { id: "2402_Qism Tany Al Menya", name: "قسم ثاني المنيا",           lat: 28.1000, lng: 30.7560 },
  { id: "2403_Qism Talt Al Menya", name: "قسم ثالث المنيا",           lat: 28.1050, lng: 30.7620 },
  { id: "2404_Qism Al Menya Al Gadeda", name: "قسم المنيا الجديدة",   lat: 28.1200, lng: 30.8000 },
  { id: "2405_Markaz Menya",     name: "مركز المنيا",                  lat: 28.0900, lng: 30.7440 },
  { id: "2406_Markaz Abo Qurqas", name: "مركز أبو قرقاص",             lat: 27.9320, lng: 30.8580 },
  { id: "2407_Qism Malawy",      name: "قسم ملوي",                    lat: 27.7290, lng: 30.8430 },
  { id: "2408_Markaz Malawy",    name: "مركز ملوي",                   lat: 27.7260, lng: 30.8400 },
  { id: "2409_Markaz Der Mowas", name: "مركز دير مواس",               lat: 27.6450, lng: 30.8700 },
  { id: "2410_Markaz Samalout Sharq", name: "مركز سمالوط شرق",        lat: 28.3050, lng: 30.7150 },
  { id: "2411_Markaz Samalout Gharb", name: "مركز سمالوط غرب",        lat: 28.3000, lng: 30.7050 },
  { id: "2412_Markaz Matay",     name: "مركز مطاي",                   lat: 28.4200, lng: 30.7800 },
  { id: "2413_Markaz Bani Mazar", name: "مركز بني مزار",              lat: 28.5030, lng: 30.7900 },
  { id: "2414_Markaz Maghaghah", name: "مركز مغاغة",                   lat: 28.6430, lng: 30.8400 },
  { id: "2415_Markaz Al Adwa",   name: "مركز العدوة",                  lat: 28.1800, lng: 30.5600 },
  { id: "2499_Desert Side Menya", name: "الجهة الصحراوية — المنيا",   lat: 27.8000, lng: 30.2000 },

  // ─── أسيوط ───
  { id: "2501_Qism Awal Assuit", name: "قسم أول أسيوط",              lat: 27.1809, lng: 31.1837 },
  { id: "2502_Qism Tany Assuit", name: "قسم ثاني أسيوط",             lat: 27.1870, lng: 31.1900 },
  { id: "2503_Markaz Assuit",    name: "مركز أسيوط",                   lat: 27.1750, lng: 31.1750 },
  { id: "2504_Qism Abo Tig",     name: "قسم أبو تيج",                 lat: 27.0420, lng: 31.3200 },
  { id: "2505_Markaz Abo Tig",   name: "مركز أبو تيج",                lat: 27.0400, lng: 31.3180 },
  { id: "2506_Markaz Al Ghanayem", name: "مركز الغنايم",              lat: 27.0150, lng: 31.2600 },
  { id: "2507_Markaz Sadfa",     name: "مركز صدفا",                   lat: 27.3200, lng: 31.4200 },
  { id: "2508_Markaz Manfalout", name: "مركز منفلوط",                  lat: 27.3120, lng: 30.9700 },
  { id: "2509_Markaz Al Qousia", name: "مركز القوصية",                lat: 27.4400, lng: 30.8200 },
  { id: "2510_Markaz Dayrout",   name: "مركز ديروط",                   lat: 27.5550, lng: 30.8110 },
  { id: "2511_Markaz Abanoub",   name: "مركز أبنوب",                   lat: 27.2830, lng: 31.2060 },
  { id: "2512_Markaz Al Fath",   name: "مركز الفتح",                   lat: 27.3100, lng: 31.1200 },
  { id: "2513_Markaz Sahel Selim", name: "مركز ساحل سليم",            lat: 27.0870, lng: 31.0680 },
  { id: "2514_Markaz Al Badary", name: "مركز البداري",                 lat: 26.9740, lng: 31.4070 },
  { id: "2515_Assuit Al Gadeda City", name: "مدينة أسيوط الجديدة",    lat: 27.2200, lng: 31.3000 },
  { id: "2599_Desert Side Assuit", name: "الجهة الصحراوية — أسيوط",  lat: 27.0000, lng: 30.5000 },

  // ─── سوهاج ───
  { id: "2601_Qism Awal Sohag",  name: "قسم أول سوهاج",              lat: 26.5591, lng: 31.6961 },
  { id: "2602_Qism Tany Sohag",  name: "قسم ثاني سوهاج",             lat: 26.5640, lng: 31.7020 },
  { id: "2603_Markaz Suhag",     name: "مركز سوهاج",                   lat: 26.5550, lng: 31.6900 },
  { id: "2604_Markaz Al Maragha", name: "مركز المراغة",               lat: 26.7000, lng: 31.7700 },
  { id: "2605_Markaz Juhayna",   name: "مركز جهينة",                   lat: 26.7500, lng: 31.6500 },
  { id: "2606_Qism Tahta",       name: "قسم طهطا",                    lat: 26.7730, lng: 31.5030 },
  { id: "2607_Markaz Tahta",     name: "مركز طهطا",                   lat: 26.7700, lng: 31.5000 },
  { id: "2608_Markaz Tama",      name: "مركز تما",                    lat: 26.5800, lng: 31.4800 },
  { id: "2609_Markaz Al Monshaah", name: "مركز المنشاة",              lat: 26.4820, lng: 31.8600 },
  { id: "2610_Markaz Al osayrat", name: "مركز العصيرات",              lat: 26.6200, lng: 31.7900 },
  { id: "2611_Qism Gerga",       name: "قسم جرجا",                    lat: 26.3430, lng: 31.9010 },
  { id: "2612_Markaz Gerga",     name: "مركز جرجا",                   lat: 26.3400, lng: 31.8980 },
  { id: "2613_Markaz Al Belina", name: "مركز البلينا",                 lat: 26.2190, lng: 32.0830 },
  { id: "2614_Markaz Dar Al Salam", name: "مركز دار السلام",          lat: 26.4100, lng: 31.9700 },
  { id: "2615_Markaz Akhmim",    name: "مركز أخميم",                   lat: 26.5620, lng: 31.7440 },
  { id: "2616_Markaz Saqultah",  name: "مركز ساقلتة",                  lat: 26.6600, lng: 31.7200 },
  { id: "2617_Qism Al kawthar",  name: "قسم الكوثر",                   lat: 26.4500, lng: 31.8000 },
  { id: "2619_Sohag Al Gadeda City", name: "مدينة سوهاج الجديدة",     lat: 26.5900, lng: 31.7500 },
  { id: "2697_Desert Side Sohag 1", name: "الجهة الصحراوية — سوهاج ١", lat: 26.3000, lng: 31.3000 },
  { id: "2699_Desert Side Sohag 3", name: "الجهة الصحراوية — سوهاج ٣", lat: 26.7000, lng: 32.2000 },

  // ─── قنا ───
  { id: "2701_Qism Qena",        name: "قسم قنا",                    lat: 26.1667, lng: 32.7167 },
  { id: "2702_Markaz Qena",      name: "مركز قنا",                   lat: 26.1600, lng: 32.7100 },
  { id: "2703_Markaz Deshna",    name: "مركز دشنا",                   lat: 26.1260, lng: 32.4510 },
  { id: "2704_Markaz Al Waqf",   name: "مركز الوقف",                  lat: 26.2130, lng: 32.7800 },
  { id: "2705_Markaz Nagaa Hamadi", name: "مركز نجع حمادي",           lat: 26.0480, lng: 32.2460 },
  { id: "2706_Markaz Farshout",  name: "مركز فرشوط",                  lat: 26.0370, lng: 32.1780 },
  { id: "2707_Markaz Abo Tesht", name: "مركز أبو تشت",                lat: 26.0730, lng: 32.1850 },
  { id: "2708_Markaz Qeft",      name: "مركز قفط",                    lat: 25.9940, lng: 32.8170 },
  { id: "2709_Markaz Qous",      name: "مركز قوص",                    lat: 25.9070, lng: 32.7540 },
  { id: "2710_Markaz Neqada",    name: "مركز نقادة",                  lat: 25.8980, lng: 32.6840 },
  { id: "2711_Qena Al Gadeda City", name: "مدينة قنا الجديدة",        lat: 26.1900, lng: 32.8000 },
  { id: "2798_Desert Side Qena 1", name: "الجهة الصحراوية — قنا ١",  lat: 26.0000, lng: 33.2000 },
  { id: "2799_Desert Side Qena 2", name: "الجهة الصحراوية — قنا ٢",  lat: 25.8000, lng: 32.3000 },

  // ─── أسوان ───
  { id: "2801_Qism Awal Aswan",  name: "قسم أول أسوان",              lat: 24.0889, lng: 32.8998 },
  { id: "2802_Qism Tany Aswan",  name: "قسم ثاني أسوان",             lat: 24.0950, lng: 32.9060 },
  { id: "2803_Markaz Aswan",     name: "مركز أسوان",                   lat: 24.0850, lng: 32.8940 },
  { id: "2804_Aswan Al Gadeda City", name: "مدينة أسوان الجديدة",     lat: 24.1200, lng: 32.9500 },
  { id: "2805_Markaz Edfu",      name: "مركز إدفو",                    lat: 24.9780, lng: 32.8740 },
  { id: "2806_Markaz Kom Umbo",  name: "مركز كوم أمبو",               lat: 24.4740, lng: 32.9490 },
  { id: "2807_Markaz Nasr AL Nouba", name: "مركز نصر النوبة",         lat: 23.1000, lng: 32.6000 },
  { id: "2808_Markaz Daraw",     name: "مركز دراو",                   lat: 24.3970, lng: 32.9440 },
  { id: "2809_Markaz Abo Sombol", name: "مركز أبو سمبل",              lat: 22.3400, lng: 31.6200 },
  { id: "2810_Toshka Al Gadeda City", name: "مدينة توشكى الجديدة",    lat: 22.5000, lng: 31.5000 },
  { id: "2896_Desert Side Aswan 1", name: "الجهة الصحراوية — أسوان ١", lat: 24.5000, lng: 33.5000 },
  { id: "2898_Desert Side Aswan 3", name: "الجهة الصحراوية — أسوان ٣", lat: 23.5000, lng: 32.0000 },
  { id: "2899_Desert Side Aswan 4", name: "الجهة الصحراوية — أسوان ٤", lat: 22.8000, lng: 31.2000 },

  // ─── الأقصر ───
  { id: "2901_Qism Luxor",       name: "قسم الأقصر",                  lat: 25.6872, lng: 32.6396 },
  { id: "2902_Markaz Luxor",     name: "مركز الأقصر",                  lat: 25.6800, lng: 32.6300 },
  { id: "2903_Markaz Tiba",      name: "مركز طيبة",                   lat: 25.7000, lng: 32.6200 },
  { id: "2904_Markaz Al Qorna",  name: "مركز القرنة",                  lat: 25.7300, lng: 32.6000 },
  { id: "2905_Markaz Armant",    name: "مركز إرمنت",                   lat: 25.6100, lng: 32.5300 },
  { id: "2906_Markaz Esna",      name: "مركز إسنا",                    lat: 25.2940, lng: 32.5580 },
  { id: "2999_Desert Side Luxor", name: "الجهة الصحراوية — الأقصر",   lat: 25.5000, lng: 32.2000 },

  // ─── البحر الأحمر ───
  { id: "3101_Qism Awal Hurghada", name: "قسم أول الغردقة",          lat: 27.2579, lng: 33.8116 },
  { id: "3102_Qism Tany Hurghada", name: "قسم ثاني الغردقة",         lat: 27.2640, lng: 33.8180 },
  { id: "3103_Qism Ras Ghareb",  name: "قسم رأس غارب",               lat: 28.3560, lng: 33.0840 },
  { id: "3104_Qism Safaga",      name: "قسم سفاجا",                   lat: 26.7430, lng: 33.9380 },
  { id: "3105_Qism Al Qossier",  name: "قسم القصير",                  lat: 26.0960, lng: 34.2810 },
  { id: "3106_Qism Marsa Alam",  name: "قسم مرسى علم",               lat: 25.0650, lng: 34.8900 },
  { id: "3107_Qism Shalateen",   name: "قسم شلاتين",                  lat: 23.1200, lng: 35.6200 },
  { id: "3108_Qism Halayeb",     name: "قسم حلايب",                   lat: 22.2000, lng: 36.6000 },
  { id: "3194_Desert Side Qism Halayeb", name: "الجهة الصحراوية — حلايب", lat: 22.5000, lng: 36.0000 },
  { id: "3198_Desert Side Qism Tany Hurghada", name: "الجهة الصحراوية — الغردقة ثاني", lat: 27.1000, lng: 33.5000 },

  // ─── الوادي الجديد ───
  { id: "3201_Qism Al Kharga",   name: "قسم الخارجة",                 lat: 25.4469, lng: 30.5520 },
  { id: "3202_Markaz Paris",     name: "مركز باريس",                   lat: 25.6000, lng: 30.2500 },
  { id: "3203_Markaz Balat",     name: "مركز بلاط",                   lat: 25.5700, lng: 29.2400 },
  { id: "3204_Markaz Al Farafra", name: "مركز الفرافرة",              lat: 27.0550, lng: 27.9700 },
  { id: "3205_Markaz Al Dakhla", name: "مركز الداخلة",                lat: 25.4890, lng: 28.9800 },
  { id: "3299_Desert Side Al Wadi Al Gaded", name: "الجهة الصحراوية — الوادي الجديد", lat: 24.0000, lng: 28.0000 },

  // ─── مطروح ───
  { id: "3301_Qism Marsa Matrouh", name: "قسم مرسى مطروح",           lat: 31.3543, lng: 27.2373 },
  { id: "3302_Qism Al Negeela",  name: "قسم النجيلة",                 lat: 31.2800, lng: 26.5000 },
  { id: "3303_Qism Sidi Berani", name: "قسم سيدي براني",              lat: 31.4750, lng: 25.9490 },
  { id: "3304_Qism Al Salom",    name: "قسم السلوم",                  lat: 31.5530, lng: 25.1600 },
  { id: "3305_Qism Al Dabaa",    name: "قسم الضبعة",                  lat: 30.9560, lng: 28.4230 },
  { id: "3306_Qism Al Alameen",  name: "قسم العلمين",                 lat: 30.8380, lng: 28.9600 },
  { id: "3307_Qism Marina Al Alameen", name: "قسم مارينا العلمين",    lat: 30.8200, lng: 28.8500 },
  { id: "3308_Qism Al Hamam",    name: "قسم الحمام",                  lat: 30.8700, lng: 29.2600 },
  { id: "3309_Qism Sewa",        name: "قسم سيوه",                    lat: 29.2000, lng: 25.5200 },
  { id: "3310_Qism Al Sahel AL Shamali Matrouh", name: "قسم الساحل الشمالي — مطروح", lat: 31.4000, lng: 26.8000 },

  // ─── جنوب سيناء ───
  { id: "3501_Qism Al Tour",     name: "قسم الطور",                   lat: 28.6000, lng: 33.6260 },
  { id: "3502_Qism Abo Rades",   name: "قسم أبو رديس",                lat: 28.9740, lng: 33.1900 },
  { id: "3503_Qism Ras Sedr",    name: "قسم رأس سدر",                 lat: 29.5880, lng: 32.6970 },
  { id: "3504_Qism Sant Catherine", name: "قسم سانت كاترين",          lat: 28.5560, lng: 33.9760 },
  { id: "3505_Qism Nuweiba",     name: "قسم نويبع",                   lat: 29.0650, lng: 34.6710 },
  { id: "3506_Qism Taba",        name: "قسم طابا",                    lat: 29.5020, lng: 34.9000 },
  { id: "3507_Qism Dahab",       name: "قسم دهب",                     lat: 28.4870, lng: 34.5110 },
  { id: "3508_Qism Awal Sharm Al Sheikh", name: "قسم أول شرم الشيخ", lat: 27.9157, lng: 34.3300 },
  { id: "3509_Qism Tany Sharm Al Sheikh", name: "قسم ثاني شرم الشيخ", lat: 27.9220, lng: 34.3380 },
  { id: "3510_Qism Abo Zenema",  name: "قسم أبو زنيمة",              lat: 29.0370, lng: 33.1040 },

  // ─── شمال سيناء ───
  { id: "3401_Qism Awal Al Areesh", name: "قسم أول العريش",           lat: 31.1300, lng: 33.8000 },
  { id: "3402_Qism Tany Al Areesh", name: "قسم ثاني العريش",          lat: 31.1360, lng: 33.8080 },
  { id: "3403_Qism Talt Al Areesh", name: "قسم ثالث العريش",          lat: 31.1420, lng: 33.8150 },
  { id: "3404_Qism Raabe Al Areesh", name: "قسم رابع العريش",         lat: 31.1480, lng: 33.8220 },
  { id: "3405_Qism Ber Abd",     name: "قسم بئر العبد",               lat: 31.0000, lng: 33.6200 },
  { id: "3406_Qism Romana",      name: "قسم رمانة",                   lat: 30.9500, lng: 33.4400 },
  { id: "3407_Qism Al Hasna",    name: "قسم الحسنة",                  lat: 30.3500, lng: 33.5100 },
  { id: "3408_Qism Nakhl",       name: "قسم نخل",                     lat: 30.0000, lng: 33.8500 },
  { id: "3409_Qism Al Kasima",   name: "قسم القسيمة",                 lat: 30.6400, lng: 34.4000 },
  { id: "3410_Qism Al Sheikh Zowayed", name: "قسم الشيخ زويد",        lat: 31.2080, lng: 34.0080 },
  { id: "3411_Qism Rafah",       name: "قسم رفح",                     lat: 31.2840, lng: 34.2520 },
];

// ============================================================
//  Haversine Formula
// ============================================================
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
//  UI Helpers
// ============================================================
function setStatus(msg, type='') {
  const el = document.getElementById('status');
  el.className = type ? `status-${type}` : '';
  el.innerHTML = msg;
}

function showChip(text) {
  const chip = document.getElementById('location-chip');
  document.getElementById('location-text').textContent = text;
  chip.classList.add('visible');
}

function hideChip() {
  document.getElementById('location-chip').classList.remove('visible');
}

function showResults(nearest) {
  const container = document.getElementById('cards-container');
  const resultsDiv = document.getElementById('results');
  container.innerHTML = '';
  resultsDiv.classList.add('visible');

  nearest.forEach((s, i) => {
    const rank = i + 1;
    const km = s.distance.toFixed(1);
    const card = document.createElement('div');
    card.className = `station-card rank-${rank}`;
    card.innerHTML = `
      <div class="rank-badge">
        <span>${rank === 1 ? '🥇' : '🥈'}</span>
        <span class="rank-label">${rank === 1 ? 'الأقرب' : 'الثاني'}</span>
      </div>
      <div class="station-info">
        <div class="station-name">${s.name}</div>
        <div class="station-id">${s.id}</div>
        <a class="map-link" href="https://maps.google.com/?q=${s.lat},${s.lng}" target="_blank" rel="noopener">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
          عرض على الخريطة
        </a>
      </div>
      <div class="distance-badge">
        <span class="distance-num">${km}</span>
        <span class="distance-unit">كيلومتر</span>
      </div>
    `;
    container.appendChild(card);
    setTimeout(() => card.classList.add('show'), 50 + i * 150);
  });
}

function findNearest(userLat, userLng) {
  const sorted = policeStations
    .map(s => ({ ...s, distance: haversineKm(userLat, userLng, s.lat, s.lng) }))
    .sort((a, b) => a.distance - b.distance);
  return sorted.slice(0, 2);
}

// ============================================================
//  GPS Locator
// ============================================================
function locateByGPS() {
  hideChip();
  setStatus('<span class="spinner"></span> جاري تحديد موقعك عبر GPS…', 'loading');

  if (!navigator.geolocation) {
    setStatus('⚠️ المتصفح لا يدعم تحديد الموقع الجغرافي.', 'error');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setStatus('✅ تم تحديد موقعك بنجاح!', 'success');
      showChip(`موقعك: ${lat.toFixed(5)}° ، ${lng.toFixed(5)}°`);
      showResults(findNearest(lat, lng));
    },
    err => {
      const msgs = { 1: 'تم رفض إذن الوصول إلى الموقع.', 2: 'تعذّر تحديد الموقع.', 3: 'انتهت مهلة الطلب.' };
      setStatus(`⚠️ ${msgs[err.code] || 'خطأ غير معروف'} — يمكنك كتابة عنوانك يدوياً.`, 'error');
    },
    { timeout: 12000, maximumAge: 60000 }
  );
}

// ============================================================
//  Step 1 — Local Egyptian Address Normalizer (no API needed)
//  Cleans colloquial Egyptian Arabic into a geocodable string
//  and resolves well-known landmarks to direct coordinates.
// ============================================================

// Well-known Egyptian landmarks / areas with direct coordinates
const KNOWN_PLACES = [
  // ═══════════════════════════════════════════════
  // القاهرة — أحياء ومناطق
  // ═══════════════════════════════════════════════
  { keys: ['وسط البلد','التحرير','ميدان التحرير','downtown cairo','وسط القاهرة'], lat: 30.0444, lng: 31.2357, name: 'وسط البلد، القاهرة' },
  { keys: ['المعادي','معادي','maadi'],                                lat: 29.9602, lng: 31.2569, name: 'المعادي، القاهرة' },
  { keys: ['مدينة نصر','nasr city','نصر سيتي'],                     lat: 30.0626, lng: 31.3361, name: 'مدينة نصر، القاهرة' },
  { keys: ['هليوبوليس','مصر الجديدة','heliopolis'],                  lat: 30.0874, lng: 31.3224, name: 'مصر الجديدة، القاهرة' },
  { keys: ['الزمالك','zamalek'],                                     lat: 30.0595, lng: 31.2194, name: 'الزمالك، القاهرة' },
  { keys: ['العباسية','abbasiya','عباسية'],                          lat: 30.0706, lng: 31.2818, name: 'العباسية، القاهرة' },
  { keys: ['شبرا الخيمة','شبرا الخيمه'],                             lat: 30.1286, lng: 31.2428, name: 'شبرا الخيمة' },
  { keys: ['شبرا'],                                                  lat: 30.0981, lng: 31.2430, name: 'شبرا، القاهرة' },
  { keys: ['الشرابية','شرابية'],                                     lat: 30.0934, lng: 31.2603, name: 'الشرابية، القاهرة' },
  { keys: ['روض الفرج','روض الفرج'],                                 lat: 30.0869, lng: 31.2488, name: 'روض الفرج، القاهرة' },
  { keys: ['المطرية','مطرية'],                                       lat: 30.1107, lng: 31.3136, name: 'المطرية، القاهرة' },
  { keys: ['عين شمس','عين شمس'],                                     lat: 30.1100, lng: 31.3400, name: 'عين شمس، القاهرة' },
  { keys: ['المرج','مرج'],                                           lat: 30.1366, lng: 31.3666, name: 'المرج، القاهرة' },
  { keys: ['النزهة','نزهة'],                                         lat: 30.0956, lng: 31.3347, name: 'النزهة، القاهرة' },
  { keys: ['الزيتون','زيتون'],                                       lat: 30.0856, lng: 31.3020, name: 'الزيتون، القاهرة' },
  { keys: ['حدائق القبة','حدايق القبة'],                             lat: 30.0847, lng: 31.2847, name: 'حدائق القبة، القاهرة' },
  { keys: ['بولاق','بولاق الدكرور'],                                 lat: 30.0572, lng: 31.2275, name: 'بولاق، القاهرة' },
  { keys: ['الأميرية','اميرية'],                                     lat: 30.0726, lng: 31.3060, name: 'الأميرية، القاهرة' },
  { keys: ['السلام','مدينة السلام'],                                 lat: 30.1218, lng: 31.3880, name: 'مدينة السلام، القاهرة' },
  { keys: ['المقطم','mokattam'],                                     lat: 30.0218, lng: 31.2892, name: 'المقطم، القاهرة' },
  { keys: ['حلوان','helwan'],                                        lat: 29.8499, lng: 31.3341, name: 'حلوان، القاهرة' },
  { keys: ['المعصرة','معصرة'],                                       lat: 29.8914, lng: 31.2867, name: 'المعصرة، القاهرة' },
  { keys: ['التبين','تبين'],                                         lat: 29.8659, lng: 31.3185, name: 'التبين، القاهرة' },
  { keys: ['بشتيل'],                                                 lat: 29.9904, lng: 31.1240, name: 'بشتيل، الجيزة' },
  { keys: ['التجمع الخامس','new cairo','القاهرة الجديدة','تجمع خامس'], lat: 30.0076, lng: 31.4913, name: 'التجمع الخامس، القاهرة الجديدة' },
  { keys: ['مدينتي','madinaty'],                                     lat: 30.1135, lng: 31.6469, name: 'مدينتي' },
  { keys: ['الشروق','el shorouk'],                                   lat: 30.1490, lng: 31.6060, name: 'مدينة الشروق' },
  { keys: ['العبور','عبور','el obour'],                              lat: 30.2100, lng: 31.5900, name: 'مدينة العبور' },
  { keys: ['العاشر من رمضان','عاشر رمضان','10th ramadan'],          lat: 30.2989, lng: 31.7482, name: 'العاشر من رمضان' },
  { keys: ['بدر','badr city','مدينة بدر'],                          lat: 30.1228, lng: 31.7400, name: 'مدينة بدر' },
  { keys: ['المظلوم','مساكن المظلوم','الشرابية مساكن'],             lat: 30.0934, lng: 31.2603, name: 'الشرابية، القاهرة' },
  { keys: ['عزبة النخل','عزبة النخل'],                              lat: 30.1050, lng: 31.3500, name: 'عزبة النخل، القاهرة' },
  { keys: ['منشية ناصر','منشية'],                                    lat: 30.0340, lng: 31.2670, name: 'منشية ناصر، القاهرة' },
  { keys: ['بستان','المنيل'],                                        lat: 30.0110, lng: 31.2240, name: 'المنيل، القاهرة' },
  { keys: ['الدرب الأحمر','درب الاحمر'],                             lat: 30.0390, lng: 31.2560, name: 'الدرب الأحمر، القاهرة' },
  { keys: ['السيدة زينب','سيدة زينب'],                               lat: 30.0330, lng: 31.2490, name: 'السيدة زينب، القاهرة' },
  { keys: ['الخليفة','حي الخليفة'],                                  lat: 30.0240, lng: 31.2620, name: 'الخليفة، القاهرة' },
  { keys: ['مصر القديمة','فسطاط','old cairo'],                       lat: 29.9990, lng: 31.2320, name: 'مصر القديمة، القاهرة' },
  { keys: ['الباسل','باسل'],                                         lat: 29.9700, lng: 31.2300, name: 'الباسل، القاهرة' },
  { keys: ['الخصوص','خصوص'],                                        lat: 30.1594, lng: 31.2489, name: 'الخصوص، القليوبية' },
  { keys: ['كوبري القبة','كوبري القبه','قبة'],                       lat: 30.0807, lng: 31.2941, name: 'كوبري القبة، القاهرة' },
  { keys: ['مصطفى النحاس','النحاس'],                                 lat: 30.0700, lng: 31.3450, name: 'مدينة نصر، القاهرة' },
  // ═══════════════════════════════════════════════
  // الجيزة
  // ═══════════════════════════════════════════════
  { keys: ['المهندسين','mohandessin','مهندسين'],                     lat: 30.0577, lng: 31.2013, name: 'المهندسين، الجيزة' },
  { keys: ['الدقي','dokki','دقي'],                                   lat: 30.0373, lng: 31.2108, name: 'الدقي، الجيزة' },
  { keys: ['الهرم','pyramids','أهرامات','هرم'],                      lat: 29.9762, lng: 31.1313, name: 'الهرم، الجيزة' },
  { keys: ['فيصل','شارع فيصل'],                                      lat: 29.9926, lng: 31.1440, name: 'فيصل، الجيزة' },
  { keys: ['الوراق','وراق'],                                         lat: 30.0784, lng: 31.2074, name: 'الوراق، الجيزة' },
  { keys: ['أكتوبر','6 أكتوبر','6th october','سادس اكتوبر','٦ اكتوبر'], lat: 29.9308, lng: 30.9228, name: 'مدينة 6 أكتوبر، الجيزة' },
  { keys: ['الشيخ زايد','sheikh zayed','زايد'],                      lat: 30.0121, lng: 30.9988, name: 'الشيخ زايد، الجيزة' },
  { keys: ['حدائق أكتوبر','حدائق اكتوبر'],                          lat: 29.9600, lng: 30.9900, name: 'حدائق أكتوبر، الجيزة' },
  { keys: ['أبو النمرس','ابو النمرس'],                               lat: 29.9200, lng: 31.0900, name: 'أبو النمرس، الجيزة' },
  { keys: ['الواحات','الواحات البحرية'],                             lat: 28.3500, lng: 28.8700, name: 'الواحات البحرية، الجيزة' },
  { keys: ['العياط','عياط'],                                         lat: 29.5700, lng: 31.2300, name: 'العياط، الجيزة' },
  { keys: ['الصف','صف'],                                             lat: 29.5700, lng: 31.2900, name: 'الصف، الجيزة' },
  { keys: ['أطفيح','اطفيح'],                                         lat: 29.4200, lng: 31.2600, name: 'أطفيح، الجيزة' },
  { keys: ['كرداسة','كرداسه'],                                       lat: 30.0140, lng: 31.0850, name: 'كرداسة، الجيزة' },
  { keys: ['أوسيم','اوسيم'],                                         lat: 30.0600, lng: 31.0900, name: 'أوسيم، الجيزة' },
  { keys: ['الجيزة','giza','جيزة'],                                  lat: 30.0131, lng: 31.2089, name: 'الجيزة' },
  // ═══════════════════════════════════════════════
  // القليوبية
  // ═══════════════════════════════════════════════
  { keys: ['القليوبية','قليوبية','بنها','benha'],                    lat: 30.4667, lng: 31.1833, name: 'بنها، القليوبية' },
  { keys: ['شبين القناطر','شبين القناطره'],                          lat: 30.3167, lng: 31.3167, name: 'شبين القناطر، القليوبية' },
  { keys: ['قليوب'],                                                  lat: 30.1847, lng: 31.2247, name: 'قليوب، القليوبية' },
  { keys: ['كفر شكر'],                                               lat: 30.5300, lng: 31.2600, name: 'كفر شكر، القليوبية' },
  { keys: ['طوخ'],                                                   lat: 30.3700, lng: 31.1800, name: 'طوخ، القليوبية' },
  // ═══════════════════════════════════════════════
  // الإسكندرية
  // ═══════════════════════════════════════════════
  { keys: ['الإسكندرية','اسكندرية','اسكندريه','alexandria'],        lat: 31.2001, lng: 29.9187, name: 'الإسكندرية' },
  { keys: ['المنتزه','montaza'],                                     lat: 31.2854, lng: 30.0118, name: 'المنتزه، الإسكندرية' },
  { keys: ['سيدي جابر','sidi gaber'],                               lat: 31.2184, lng: 29.9452, name: 'سيدي جابر، الإسكندرية' },
  { keys: ['كليوباترا','كليوبترا'],                                   lat: 31.2300, lng: 29.9700, name: 'كليوباترا، الإسكندرية' },
  { keys: ['سموحة','سموحه'],                                         lat: 31.2050, lng: 29.9470, name: 'سموحة، الإسكندرية' },
  { keys: ['لوران','لوران اسكندرية'],                                lat: 31.2370, lng: 29.9600, name: 'لوران، الإسكندرية' },
  { keys: ['المحطة','محطة مصر اسكندرية','رمل اسكندرية'],            lat: 31.1975, lng: 29.9088, name: 'وسط الإسكندرية' },
  { keys: ['عامرية','العامرية'],                                     lat: 30.9800, lng: 29.7900, name: 'العامرية، الإسكندرية' },
  { keys: ['برج العرب','برج العرب'],                                 lat: 30.8800, lng: 29.5200, name: 'برج العرب، الإسكندرية' },
  { keys: ['أبو قير','ابو قير','abu qir'],                          lat: 31.3200, lng: 30.0700, name: 'أبو قير، الإسكندرية' },
  { keys: ['المكس','مكس'],                                           lat: 31.1700, lng: 29.8400, name: 'المكس، الإسكندرية' },
  { keys: ['الدخيلة','دخيلة'],                                       lat: 31.1500, lng: 29.8700, name: 'الدخيلة، الإسكندرية' },
  { keys: ['العجمي','عجمي'],                                         lat: 31.0800, lng: 29.7900, name: 'العجمي، الإسكندرية' },
  // ═══════════════════════════════════════════════
  // القاهرة الكبرى / المدن الجديدة
  // ═══════════════════════════════════════════════
  { keys: ['العاصمة الإدارية','العاصمة الادارية'],                   lat: 30.0330, lng: 31.7394, name: 'العاصمة الإدارية الجديدة' },
  // ═══════════════════════════════════════════════
  // الدلتا
  // ═══════════════════════════════════════════════
  { keys: ['طنطا','tanta'],                                          lat: 30.7865, lng: 30.9985, name: 'طنطا، الغربية' },
  { keys: ['كفر الشيخ','كفر الشيخ','kafr el sheikh'],               lat: 31.1107, lng: 30.9388, name: 'كفر الشيخ' },
  { keys: ['دسوق','دسوق'],                                           lat: 31.1831, lng: 30.6467, name: 'دسوق، كفر الشيخ' },
  { keys: ['فوه'],                                                   lat: 31.1900, lng: 30.5700, name: 'فوه، كفر الشيخ' },
  { keys: ['بيلا'],                                                  lat: 31.1700, lng: 30.8500, name: 'بيلا، كفر الشيخ' },
  { keys: ['سمنود'],                                                 lat: 30.9600, lng: 31.2400, name: 'سمنود، الغربية' },
  { keys: ['المحلة الكبرى','المحلة','mahalla'],                      lat: 30.9760, lng: 31.1651, name: 'المحلة الكبرى، الغربية' },
  { keys: ['زفتى','زفتا'],                                           lat: 30.7000, lng: 31.2400, name: 'زفتى، الغربية' },
  { keys: ['المنصورة','mansoura'],                                   lat: 31.0409, lng: 31.3785, name: 'المنصورة، الدقهلية' },
  { keys: ['ميت غمر','ميت غمر'],                                     lat: 30.7200, lng: 31.2600, name: 'ميت غمر، الدقهلية' },
  { keys: ['دكرنس'],                                                 lat: 31.0800, lng: 31.5000, name: 'دكرنس، الدقهلية' },
  { keys: ['أجا','اجا'],                                             lat: 30.9100, lng: 31.4800, name: 'أجا، الدقهلية' },
  { keys: ['شربين'],                                                 lat: 31.2000, lng: 31.3900, name: 'شربين، الدقهلية' },
  { keys: ['تلا'],                                                   lat: 30.6900, lng: 30.9400, name: 'تلا، المنوفية' },
  { keys: ['المنوفية','منوفية','شبين الكوم','شبين الكوم'],          lat: 30.5640, lng: 30.9764, name: 'شبين الكوم، المنوفية' },
  { keys: ['أشمون','اشمون'],                                         lat: 30.2900, lng: 30.9800, name: 'أشمون، المنوفية' },
  { keys: ['قويسنا'],                                                lat: 30.5900, lng: 31.0700, name: 'قويسنا، المنوفية' },
  { keys: ['السادات','مدينة السادات'],                               lat: 30.3800, lng: 30.5300, name: 'مدينة السادات، المنوفية' },
  { keys: ['الزقازيق','زقازيق','zagazig'],                          lat: 30.5873, lng: 31.5020, name: 'الزقازيق، الشرقية' },
  { keys: ['العاشر من رمضان','عاشر رمضان'],                         lat: 30.2989, lng: 31.7482, name: 'العاشر من رمضان' },
  { keys: ['بلبيس','بلبيس'],                                        lat: 30.8667, lng: 31.5500, name: 'بلبيس، الشرقية' },
  { keys: ['أبو حماد','ابو حماد'],                                   lat: 30.7500, lng: 31.6700, name: 'أبو حماد، الشرقية' },
  { keys: ['فاقوس'],                                                 lat: 30.7300, lng: 31.8000, name: 'فاقوس، الشرقية' },
  { keys: ['ههيا'],                                                  lat: 30.6900, lng: 31.8900, name: 'ههيا، الشرقية' },
  { keys: ['دمياط','damietta'],                                      lat: 31.4165, lng: 31.8133, name: 'دمياط' },
  { keys: ['رأس البر','رأس البر'],                                   lat: 31.4800, lng: 31.8600, name: 'رأس البر، دمياط' },
  { keys: ['الجمالية'],                                              lat: 31.4800, lng: 31.7600, name: 'الجمالية، دمياط' },
  { keys: ['فارسكور'],                                               lat: 31.3300, lng: 31.7200, name: 'فارسكور، دمياط' },
  { keys: ['كفر سعد'],                                              lat: 31.3800, lng: 31.7800, name: 'كفر سعد، دمياط' },
  { keys: ['دمنهور','damanhur'],                                     lat: 31.0367, lng: 30.4680, name: 'دمنهور، البحيرة' },
  { keys: ['كفر الدوار','كفر الدوار'],                               lat: 31.1300, lng: 30.1200, name: 'كفر الدوار، البحيرة' },
  { keys: ['إيتاي البارود','ايتاي البارود'],                         lat: 30.8700, lng: 30.6600, name: 'إيتاي البارود، البحيرة' },
  { keys: ['أبو المطامير','ابو المطامير'],                           lat: 30.7800, lng: 30.3400, name: 'أبو المطامير، البحيرة' },
  { keys: ['رشيد','rosetta'],                                        lat: 31.4023, lng: 30.4180, name: 'رشيد، البحيرة' },
  { keys: ['الدلنجات'],                                              lat: 30.8800, lng: 30.5000, name: 'الدلنجات، البحيرة' },
  { keys: ['أبو حمص','ابو حمص'],                                     lat: 30.9400, lng: 30.3800, name: 'أبو حمص، البحيرة' },
  // ═══════════════════════════════════════════════
  // قناة السويس
  // ═══════════════════════════════════════════════
  { keys: ['السويس','suez','سويس'],                                  lat: 29.9668, lng: 32.5498, name: 'السويس' },
  { keys: ['الإسماعيلية','اسماعيلية','ismailia'],                   lat: 30.5965, lng: 32.2715, name: 'الإسماعيلية' },
  { keys: ['بورسعيد','بورسعيد','port said'],                        lat: 31.2565, lng: 32.2841, name: 'بورسعيد' },
  { keys: ['الفيوم','fayoum','فيوم'],                                lat: 29.3084, lng: 30.8428, name: 'الفيوم' },
  { keys: ['سنورس'],                                                 lat: 29.2800, lng: 30.8500, name: 'سنورس، الفيوم' },
  { keys: ['إطسا','اطسا'],                                           lat: 29.4300, lng: 30.9800, name: 'إطسا، الفيوم' },
  { keys: ['بني سويف','beni suef'],                                  lat: 29.0669, lng: 31.0969, name: 'بني سويف' },
  { keys: ['الواسطى','واسطى'],                                       lat: 29.3300, lng: 31.2700, name: 'الواسطى، بني سويف' },
  { keys: ['ناصر بني سويف','ناصر'],                                  lat: 29.2600, lng: 31.0900, name: 'ناصر، بني سويف' },
  { keys: ['المنيا','minia','منيا'],                                  lat: 28.0871, lng: 30.7618, name: 'المنيا' },
  { keys: ['مغاغة'],                                                 lat: 28.6500, lng: 30.7800, name: 'مغاغة، المنيا' },
  { keys: ['بني مزار','بني مزار'],                                   lat: 28.4900, lng: 30.7900, name: 'بني مزار، المنيا' },
  { keys: ['ملوي','ملوي'],                                           lat: 27.7300, lng: 30.8500, name: 'ملوي، المنيا' },
  { keys: ['أسيوط','اسيوط','asyut'],                                 lat: 27.1783, lng: 31.1859, name: 'أسيوط' },
  { keys: ['ديروط','ديروط'],                                         lat: 27.5400, lng: 30.8100, name: 'ديروط، أسيوط' },
  { keys: ['القوصية','قوصية'],                                       lat: 27.4400, lng: 30.8200, name: 'القوصية، أسيوط' },
  { keys: ['سوهاج','sohag'],                                         lat: 26.5590, lng: 31.6948, name: 'سوهاج' },
  { keys: ['طهطا','طهطا'],                                           lat: 26.7800, lng: 31.5000, name: 'طهطا، سوهاج' },
  { keys: ['جرجا','جرجا'],                                           lat: 26.3400, lng: 31.8980, name: 'جرجا، سوهاج' },
  { keys: ['قنا','qena'],                                            lat: 26.1667, lng: 32.7167, name: 'قنا' },
  { keys: ['نجع حمادي','نجع حمادي'],                                 lat: 26.0480, lng: 32.2460, name: 'نجع حمادي، قنا' },
  { keys: ['الأقصر','luxor','اقصر'],                                 lat: 25.6872, lng: 32.6396, name: 'الأقصر' },
  { keys: ['أسوان','aswan','اسوان'],                                 lat: 24.0889, lng: 32.8998, name: 'أسوان' },
  { keys: ['كوم أمبو','كوم امبو'],                                   lat: 24.4740, lng: 32.9490, name: 'كوم أمبو، أسوان' },
  { keys: ['إدفو','ادفو'],                                           lat: 24.9780, lng: 32.8740, name: 'إدفو، أسوان' },
  // ═══════════════════════════════════════════════
  // سيناء والبحر الأحمر
  // ═══════════════════════════════════════════════
  { keys: ['شرم الشيخ','sharm el sheikh','شرم'],                     lat: 27.9157, lng: 34.3300, name: 'شرم الشيخ' },
  { keys: ['الغردقة','hurghada','هرجادة'],                           lat: 27.2579, lng: 33.8116, name: 'الغردقة' },
  { keys: ['مرسى علم','مرسى علم'],                                   lat: 25.0650, lng: 34.8900, name: 'مرسى علم، البحر الأحمر' },
  { keys: ['سفاجا'],                                                 lat: 26.7430, lng: 33.9380, name: 'سفاجا، البحر الأحمر' },
  { keys: ['العريش','areesh'],                                       lat: 31.1300, lng: 33.8000, name: 'العريش، شمال سيناء' },
  { keys: ['رفح','rafah'],                                           lat: 31.2840, lng: 34.2520, name: 'رفح، شمال سيناء' },
  { keys: ['الطور','طور سيناء'],                                     lat: 28.6000, lng: 33.6260, name: 'الطور، جنوب سيناء' },
  { keys: ['دهب','dahab'],                                           lat: 28.4870, lng: 34.5110, name: 'دهب، جنوب سيناء' },
  { keys: ['نويبع','nuweiba'],                                       lat: 29.0650, lng: 34.6710, name: 'نويبع، جنوب سيناء' },
  { keys: ['طابا','taba'],                                           lat: 29.5020, lng: 34.9000, name: 'طابا، جنوب سيناء' },
  // ═══════════════════════════════════════════════
  // الصعيد الأوسط والأعلى
  // ═══════════════════════════════════════════════
  { keys: ['الغردقة','hurghada'],                                    lat: 27.2579, lng: 33.8116, name: 'الغردقة' },
  { keys: ['مرسى مطروح','مطروح','matrouh'],                          lat: 31.3543, lng: 27.2373, name: 'مرسى مطروح' },
  { keys: ['العلمين','العلمين الجديدة','alamein'],                   lat: 30.8380, lng: 28.9600, name: 'العلمين' },
  { keys: ['السلوم','سلوم'],                                         lat: 31.5530, lng: 25.1600, name: 'السلوم، مطروح' },
  { keys: ['الخارجة','خارجة','وادي الجديد'],                        lat: 25.4469, lng: 30.5520, name: 'الخارجة، الوادي الجديد' },
  { keys: ['الداخلة','داخلة'],                                       lat: 25.4890, lng: 28.9800, name: 'الداخلة، الوادي الجديد' },
  { keys: ['الفرافرة','فرافرة'],                                     lat: 27.0550, lng: 27.9700, name: 'الفرافرة، الوادي الجديد' },
  { keys: ['سيوه','سيوة','siwa'],                                    lat: 29.2000, lng: 25.5200, name: 'سيوة، مطروح' },
];

// Colloquial → formal substitutions
const COLLOQUIAL_MAP = [
  // street / area terms
  [/\bبلوك\b/g,          'بلوك'],          // keep but let geocoder handle
  [/\bكمبوند\b/g,        'مجمع سكني'],
  [/\bميدان\b/g,         'ميدان'],
  [/\bع\s+الكوبري\b/gi,  'كوبري'],
  [/\bكورنيش\b/g,        'كورنيش'],
  // common shorthand
  [/\bوسط\s+البلد\b/g,   'وسط البلد القاهرة'],
  [/\bمدن\s+نصر\b/g,     'مدينة نصر القاهرة'],
  [/\bالقاهره\b/g,       'القاهرة'],
  [/\bاسكندريه\b/g,      'الإسكندرية'],
  [/\bالجيزه\b/g,        'الجيزة'],
  [/\bالزقازيق\b/g,      'الزقازيق، الشرقية'],
  [/\bطنطا\b/g,          'طنطا، الغربية'],
  [/\bالمنصوره\b/g,      'المنصورة، الدقهلية'],
  [/\bالمنصورة\b/g,      'المنصورة، الدقهلية'],
  [/\bاسيوط\b|أسيوط/g,  'أسيوط'],
  [/\bبني سويف\b/g,      'بني سويف'],
  [/\bالفيوم\b/g,        'الفيوم'],
  [/\bمرسي مطروح\b/g,    'مرسى مطروح'],
];

function localNormalizeAddress(raw) {
  const q = raw.trim();

  // 1. Check direct coordinate lookup (landmark match)
  const lower = q.toLowerCase();
  for (const place of KNOWN_PLACES) {
    if (place.keys.some(k => lower.includes(k.toLowerCase()))) {
      return { normalizedQuery: place.name, lat: place.lat, lng: place.lng, displayName: place.name };
    }
  }

  // 2. Apply colloquial substitutions
  let normalized = q;
  for (const [pattern, replacement] of COLLOQUIAL_MAP) {
    normalized = normalized.replace(pattern, replacement);
  }

  // 3. Strip very specific sub-address noise (block numbers, apartment details)
  //    that confuse geocoders — keep the district/city part
  normalized = normalized
    .replace(/بلوك\s*\d+/g, '')         // بلوك 21 → removed
    .replace(/شقة\s*\d+/g, '')          // شقة 5 → removed
    .replace(/دور\s*\d+/g, '')          // دور 3 → removed
    .replace(/عمارة\s*\w+/g, '')        // عمارة أ → removed
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 4. If still looks like a very vague single word, append مصر for geocoder
  const wordCount = normalized.split(/\s+/).length;
  if (wordCount === 1) normalized = normalized + '، مصر';

  return { normalizedQuery: normalized, lat: null, lng: null, displayName: normalized };
}

// ============================================================
//  Geocoding — Nominatim مع CORS proxies كـ fallback
//  يعمل سواء من file:// أو أي سيرفر
// ============================================================

// قائمة endpoints — يجرب كل واحد بالترتيب
const NOMINATIM_ENDPOINTS = [
  // 1. Direct (يشتغل من localhost وأي موقع مستضاف)
  q => `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=ar&countrycodes=eg`,
  // 2. CORS proxy مجاني — يحل مشكلة file://
  q => `https://corsproxy.io/?url=${encodeURIComponent('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=1&accept-language=ar&countrycodes=eg')}`,
  // 3. proxy بديل
  q => `https://api.allorigins.win/get?url=${encodeURIComponent('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=1&accept-language=ar&countrycodes=eg')}`,
];

async function geocodeNominatim(query) {
  // تأكد إن الـ query لا يزيد عن 200 حرف
  const safeQuery = query.length > 200 ? query.substring(0, 200) : query;
  const q = safeQuery + (safeQuery.includes('مصر') ? '' : ' مصر');

  for (let i = 0; i < NOMINATIM_ENDPOINTS.length; i++) {
    try {
      const url = NOMINATIM_ENDPOINTS[i](safeQuery);
      const resp = await fetch(url, {
        headers: i === 0 ? { 'Accept-Language': 'ar', 'User-Agent': 'EgyptPoliceFinderApp/1.0' } : {}
      });
      if (!resp.ok) continue;

      let raw = await resp.json();

      // allorigins بيرجع الداتا جوه .contents كـ string
      if (i === 2 && raw.contents) {
        try { raw = JSON.parse(raw.contents); } catch { continue; }
      }

      const data = Array.isArray(raw) ? raw : [];
      if (!data.length) continue;

      const { lat, lon, display_name } = data[0];
      const shortName = display_name.split(',').slice(0, 2).join('،');
      return { lat: parseFloat(lat), lng: parseFloat(lon), displayName: shortName };
    } catch (e) {
      console.warn(`Geocoder endpoint ${i} failed:`, e.message);
    }
  }
  return null;
}

// ============================================================
//  Main search — local normalize → geocode → show results
// ============================================================
async function searchByText() {
  const rawQuery = document.getElementById('address-input').value.trim();
  if (!rawQuery) {
    setStatus('⚠️ الرجاء إدخال عنوانك في حقل البحث أولاً.', 'error');
    return;
  }

  hideChip();
  setStatus('<span class="spinner"></span> جاري تحليل العنوان…', 'loading');

  // ── Step 1: Local normalization (instant, no API) ──
  const normalized = localNormalizeAddress(rawQuery);

  // إذا عرفنا الموقع من الـ KNOWN_PLACES مباشرة
  if (normalized.lat && normalized.lng) {
    setStatus('✅ تم تحديد الموقع بنجاح', 'success');
    showChip(`📍 ${normalized.displayName}`);
    showResults(findNearest(normalized.lat, normalized.lng));
    return;
  }

  // ── Step 2: Geocode ──
  setStatus('<span class="spinner"></span> جاري تحديد الموقع…', 'loading');

  const searchQuery = normalized.normalizedQuery || rawQuery;
  let result = null;

  // محاولة أولى: الـ query المعالج
  result = await geocodeNominatim(searchQuery);

  // محاولة ثانية: الـ query الأصلي إذا كان مختلفاً
  if (!result && searchQuery !== rawQuery) {
    result = await geocodeNominatim(rawQuery);
  }

  if (!result) {
    setStatus('⚠️ لم يتم التعرف على العنوان. جرّب: "المعادي، القاهرة" أو "طنطا، الغربية".', 'error');
    return;
  }

  setStatus('✅ تم تحديد الموقع بنجاح', 'success');
  showChip(`📍 ${result.displayName}`);
  showResults(findNearest(result.lat, result.lng));
}

// ─── Allow Enter key to trigger search ───
document.getElementById('address-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchByText();
});

// ─── Update count badge ───
document.getElementById('stations-count').textContent = policeStations.length;
  
  window.addEventListener('load', function() {
    if (typeof ActiveUsersWidget !== 'undefined') {
      ActiveUsersWidget.init({ position: 'corner' });
    }
  });
