/* =============================================================================
   BTS SUKHUMVIT LINE 3D — Authentic Bangkok City & Driver Simulator
   Vanilla ES6 · Three.js r128 · OrbitControls
   47 stations · N24 Khu Khot ↔ E23 Kheha · four procedural city zones
   Built with OpenCode + DeepSeek V4.1 Flash
   ============================================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------------------------
     Constants
     ------------------------------------------------------------------------ */

  const VERSION = '1.0.0';
  const APP_NAME = 'BTS Sukhumvit Line 3D';
  const WORLD_PER_M = 0.25;             // world units per displayed metre
  const TRACK_Y = 5.2;                  // viaduct deck / rail height
  const CAR_LEN = 5.2;                  // 20.8 display metres
  const CAR_GAP = 0.55;
  const CAR_PITCH = CAR_LEN + CAR_GAP;
  const MAX_SPEED = 100;                // km/h
  const ACCEL = 4.2;                    // km/h per second
  const BRAKE_DECEL = 5.2;
  const EMERGENCY_DECEL = 11.5;
  const COAST_DECEL = 0.85;
  const AUTO_CRUISE = 80;
  const AUTO_DECEL = 1.2;              // display m/s²
  const DWELL_SECONDS = 6.0;
  const STATION_STOP_TOLERANCE = 20;    // display metres
  const DOOR_INTERLOCK = 0.04;
  const PARAMS = new URLSearchParams(location.search);
  const IS_SELFTEST = PARAMS.has('selftest');
  const AUTOSTART = PARAMS.has('autostart') || IS_SELFTEST;
  const Y_AXIS = new THREE.Vector3(0, 1, 0);

  const INTERCHANGES = {
    MRT:    { name: 'MRT Blue Line', short: 'MRT BLUE', color: '#2d9cdb' },
    PINK:   { name: 'MRT Pink Line', short: 'MRT PINK', color: '#f178b6' },
    YELLOW: { name: 'MRT Yellow Line', short: 'MRT YELLOW', color: '#f2c94c' },
    ARL:    { name: 'Airport Rail Link', short: 'ARL', color: '#e5484d' },
    BRT:    { name: 'Bangkok BRT', short: 'BRT', color: '#f2994a' },
    SILOM:  { name: 'BTS Silom Line', short: 'BTS SILOM', color: '#005a36' }
  };

  const INTERCHANGES_TH = {
    MRT: 'รถไฟฟ้ามหานคร สายเฉลองรัชมงคล (สายสีน้ำเงิน)',
    PINK: 'รถไฟฟ้าสายสีชมพู',
    YELLOW: 'รถไฟฟ้าสายสีเหลือง',
    ARL: 'รถไฟฟ้าแอร์พอร์ต เรล ลิงก์',
    BRT: 'รถโดยสารด่วนพิเศษ บีอาร์ที',
    SILOM: 'รถไฟฟ้าบีทีเอส สายสีลม'
  };

  const ZONES = {
    A: {
      key: 'A', label: 'Northern Suburbs', th: 'ชานเมืองเหนือ',
      css: '#8bc34a', color: 0x8bc34a,
      desc: 'Low-rise shop houses · open sky · Chatuchak green',
      thDesc: 'ทาวน์เฮาส์เตี้ย · ฟ้าเปิด · สวนจตุจักร',
      count: 34, height: [1.8, 5.4], spread: 150, near: 14, far: 62,
      trees: 15, glass: 0.04
    },
    B: {
      key: 'B', label: 'Central Commercial Core', th: 'ศูนย์กลางธุรกิจ',
      css: '#00a651', color: 0x00a651,
      desc: 'Skyscraper canyon · Siam skywalks · corporate glass',
      thDesc: 'ตึกระฟ้า · สกายวอล์คสยาม · กระจกสำนักงาน',
      count: 62, height: [12, 50], spread: 160, near: 13, far: 82,
      trees: 3, glass: 0.46
    },
    C: {
      key: 'C', label: 'Sukhumvit Lifestyle Corridor', th: 'ย่านสุขุมวิท',
      css: '#f2c94c', color: 0xf2c94c,
      desc: 'Condos · hotels · neon sois · Benchasiri Park',
      thDesc: 'คอนโด · โรงแรม · ป้ายนีออน · สวนเบญจสิริ',
      count: 48, height: [7, 30], spread: 150, near: 13, far: 72,
      trees: 5, glass: 0.28
    },
    D: {
      key: 'D', label: 'Southern Industrial & Coastal Delta', th: 'เขตอุตสาหกรรมและปากน้ำ',
      css: '#2d9cdb', color: 0x2d9cdb,
      desc: 'Mid-rise · warehouses · flat delta horizon · Erawan',
      thDesc: 'อาคารกลาง · โรงงาน · ที่ราบปากน้ำ · เอราวัณ',
      count: 40, height: [2.2, 14], spread: 170, near: 14, far: 86,
      trees: 6, glass: 0.1
    }
  };

  // 47 operational stations. N6 Sena Ruam (unopened infill) is intentionally omitted.
  const STATIONS = [
    ['N24', 'Khu Khot', 'คูคต', 'A', [], 'Wat Sai Mai & Khu Khot Park-and-Ride', 'วัดสายไหม และอาคารจอดแล้วจรคูคต'],
    ['N23', 'Yaek Kor Por Aor', 'แยกคปอ.', 'A', [], 'Royal Thai Air Force HQ & Park-and-Ride', 'กองบัญชาการกองทัพอากาศ และอาคารจอดแล้วจรแยก คปอ.'],
    ['N22', 'Royal Thai Air Force Museum', 'พิพิธภัณฑ์กองทัพอากาศ', 'A', [], 'Royal Thai Air Force Museum', 'พิพิธภัณฑ์กองทัพอากาศและการบินแห่งชาติ'],
    ['N21', 'Bhumibol Adulyadej Hospital', 'โรงพยาบาลภูมิพลอดุลยเดช', 'A', [], 'Bhumibol Adulyadej Hospital', 'โรงพยาบาลภูมิพลอดุลยเดช'],
    ['N20', 'Saphan Mai', 'สะพานใหม่', 'A', [], 'Ying Charoen Market', 'ตลาดยิ่งเจริญ'],
    ['N19', 'Sai Yud', 'สายหยุด', 'A', [], 'CGH Phahon Yothin Hospital', 'โรงพยาบาลซีจีเอช พหลโยธิน'],
    ['N18', 'Phahon Yothin 59', 'พหลโยธิน 59', 'A', [], 'Lotus Lak Si', 'โลตัส หลักสี่'],
    ['N17', 'Wat Phra Sri Mahathat', 'วัดพระศรีมหาธาตุ', 'A', ['PINK'], 'Wat Phra Sri Mahathat & Bang Khen District Office', 'วัดพระศรีมหาธาตุวรมหาวิหาร และสำนักงานเขตบางเขน'],
    ['N16', '11th Infantry Regiment', 'กรมทหารราบที่ 11', 'A', [], '11th Infantry Regiment', 'กรมทหารราบที่ 11'],
    ['N15', 'Bang Bua', 'บางบัว', 'A', [], 'Sripatum University & Wat Bang Bua', 'มหาวิทยาลัยศรีปทุม และวัดบางบัว'],
    ['N14', 'Royal Forest Department', 'กรมป่าไม้', 'A', [], 'Royal Forest Department', 'กรมป่าไม้ และกรมอุทยานแห่งชาติ'],
    ['N13', 'Kasetsart University', 'มหาวิทยาลัยเกษตรศาสตร์', 'A', [], 'Kasetsart University', 'มหาวิทยาลัยเกษตรศาสตร์'],
    ['N12', 'Sena Nikhom', 'เสนานิคม', 'A', [], 'Paolo Kaset Hospital & Bang Khen Market', 'โรงพยาบาลเปาโล เกษตร และตลาดบางเขน'],
    ['N11', 'Ratchayothin', 'รัชโยธิน', 'A', [], 'Major Cineplex Ratchayothin & Elephant Tower', 'เมเจอร์ ซีนีเพล็กซ์ รัชโยธิน และตึกช้าง'],
    ['N10', 'Phahon Yothin 24', 'พหลโยธิน 24', 'A', [], 'Horwang School & Shinawatra Tower 3', 'โรงเรียนหอวัง และตึกชินวัตร 3'],
    ['N9', 'Ha Yaek Lat Phrao', 'ห้าแยกลาดพร้าว', 'A', ['MRT'], 'Central Ladprao & Union Mall', 'เซ็นทรัล ลาดพร้าว และยูเนี่ยน มอลล์'],
    ['N8', 'Mo Chit', 'หมอชิต', 'B', ['MRT', 'BRT'], 'Chatuchak Market & Vachirabenjatas Park', 'ตลาดนัดจตุจักร และสวนวชิรเบญจทัศ'],
    ['N7', 'Saphan Khwai', 'สะพานขวาง', 'B', [], 'Paolo Phahon Yothin Hospital & Or Tor Kor Market', 'โรงพยาบาลเปาโล พหลโยธิน และตลาด อ.ต.ก.'],
    ['N5', 'Ari', 'อารีย์', 'B', [], 'Ari lifestyle district & Pearl Bangkok', 'ย่านอารีย์ และอาคารเพิร์ล แบงก์ค็อก'],
    ['N4', 'Sanam Pao', 'สนามเป้า', 'B', [], 'Phyathai 2 Hospital & Channel 5', 'โรงพยาบาลพญาไท 2 และสถานีวิทยุโทรทัศน์กองทัพบกช่อง 5'],
    ['N3', 'Victory Monument', 'อนุสาวรีย์ชัยสมรภูมิ', 'B', [], 'Victory Monument & Center One', 'อนุสาวรีย์ชัยสมรภูมิ และเซ็นเตอร์ วัน'],
    ['N2', 'Phaya Thai', 'พญาไท', 'B', ['ARL'], 'Phaya Thai Palace & Wannasorn Building', 'พระราชวังพญาไท และอาคารวรรณสรณ์'],
    ['N1', 'Ratchathewi', 'ราชเทวี', 'B', [], 'Hua Chang Bridge & Baiyoke Tower 2', 'สะพานหัวช้าง และตึกใบหยก 2'],
    ['CEN', 'Siam', 'สยาม', 'B', ['SILOM', 'MRT'], 'Siam Paragon, Siam Square & BACC', 'สยามพารากอน สยามสแควร์ และหอศิลปวัฒนธรรมแห่งกรุงเทพมหานคร'],
    ['E1', 'Chit Lom', 'ชิดลม', 'B', [], 'Erawan Shrine & CentralWorld', 'ศาลท้าวมหาพรหมเอราวัณ และเซ็นทรัลเวิลด์'],
    ['E2', 'Phloen Chit', 'เพลินจิต', 'B', [], 'Central Embassy & Park Ventures', 'เซ็นทรัล เอ็มบาสซี และอาคารปาร์คเวนเชอร์'],
    ['E3', 'Nana', 'นานา', 'B', [], 'Nana Square & Sukhumvit Soi 11', 'นานาสแควร์ และซอยสุขุมวิท 11'],
    ['E4', 'Asok', 'อโศก', 'C', ['MRT'], 'Terminal 21 & Benjakitti Park', 'เทอร์มินัล 21 และสวนเบญจกิติ'],
    ['E5', 'Phrom Phong', 'พร้อมพงษ์', 'C', [], 'The Em District & Benchasiri Park', 'เดอะเอ็มดิสทริค (เอ็มโพเรียม/เอ็มควอเทียร์/เอ็มสเฟียร์) และสวนเบญจสิริ'],
    ['E6', 'Thong Lo', 'ทองหล่อ', 'C', [], 'Thong Lo Soi 55', 'ทองหล่อซอย 55'],
    ['E7', 'Ekkamai', 'เอกมัย', 'C', [], 'Eastern Bus Terminal & Bangkok Planetarium', 'สถานีขนส่งเอกมัย และท้องฟ้าจำลองกรุงเทพ'],
    ['E8', 'Phra Khanong', 'พระโขนง', 'D', [], 'W District', 'ดับบลิว ดิสทริค'],
    ['E9', 'On Nut', 'อ่อนนุช', 'D', [], 'Lotus Sukhumvit 50 & Century Movie Plaza', 'โลตัส สุขุมวิท 50 และเซ็นจูรี มูฟวี่ พลาซ่า'],
    ['E10', 'Bang Chak', 'บางจาก', 'D', [], 'Bangchak Headquarters & Bang Chak Market', 'สำนักงานใหญ่บางจาก และตลาดบางจาก'],
    ['E11', 'Punnawithi', 'ปุณณวิถี', 'D', [], 'True Digital Park', 'ทรู ดิจิทัล พาร์ค'],
    ['E12', 'Udom Suk', 'อุดมสุข', 'D', [], 'Udom Suk Market & Mega Bangna shuttle', 'ตลาดอุดมสุข และรถรับส่งเมกะบางนา'],
    ['E13', 'Bang Na', 'บางนา', 'D', [], 'BITEC Bangna & Meteorological Department', 'ไบเทค บางนา และกรมอุตุนิยมวิทยา'],
    ['E14', 'Bearing', 'แบริ่ง', 'D', [], 'Saint Joseph Bangna & Bangkok Patana School', 'โรงเรียนเซนต์โยเซฟบางนา และโรงเรียนนานาชาติบางกอกพัฒนา'],
    ['E15', 'Samrong', 'สำโรง', 'D', ['YELLOW'], 'Imperial World Samrong & Samrong Market', 'อิมพีเรียล เวิลด์ สำโรง และตลาดสำโรง'],
    ['E16', 'Pu Chao', 'ปู่เจ้า', 'D', [], 'Big C Samrong 2 & Toyota showroom', 'บิ๊กซี สำโรง 2 และโชว์รูมโตโยต้า'],
    ['E17', 'Chang Erawan', 'ช้างเอราวัณ', 'D', [], 'Erawan Museum', 'พิพิธภัณฑ์ช้างเอราวัณ'],
    ['E18', 'Royal Thai Naval Academy', 'ราชนาวี', 'D', [], 'Royal Thai Naval Academy & Naval Museum', 'โรงเรียนนายเรือ และพิพิธภัณฑ์ทหารเรือ'],
    ['E19', 'Pak Nam', 'ปากน้ำ', 'D', [], 'Samut Prakan Observation Tower & Pak Nam Market', 'หอชมเมืองสมุทรปราการ และตลาดปากน้ำ'],
    ['E20', 'Srinagarindra', 'ศรีนครินทร์', 'D', [], 'Paolo Samut Prakan Hospital', 'โรงพยาบาลเปาโล สมุทรปราการ'],
    ['E21', 'Phraek Sa', 'แพรกษา', 'D', [], 'Robinson Samut Prakan & Big C', 'โรบินสัน สมุทรปราการ และบิ๊กซี'],
    ['E22', 'Sai Luat', 'สายลวด', 'D', [], 'Sai Luat Bus Depot & Community', 'อู่รถเมล์สาย 25 และ 142 และชุมชนซอยสายลวด'],
    ['E23', 'Kheha', 'เคหะฯ', 'D', [], 'Ancient City & Bang Pu Recreation Center', 'เมืองโบราณ และสถานตากอากาศบางปู']
  ].map(([code, en, th, zone, interchange, landmark, landmarkTh], i) => ({
    index: i, code, en, th, zone, interchange, landmark, landmarkTh
  }));

  /* ---------------------------------------------------------------------------
     Bilingual dictionary
     ------------------------------------------------------------------------ */

  const I18N = {
    en: {
      introCopy: 'Climb into the cab of a four-car Bangkok Skytrain. Drive 47 elevated stations from Khu Khot to Kheha through shop-house suburbs, the Siam skyscraper canyon, Sukhumvit neon and the southern delta.',
      stations: 'STATIONS', zones: 'CITY ZONES', cameras: 'CAMERAS', railPower: 'RAIL POWER',
      boardSiam: 'BOARD AT SIAM', startKhuKhot: 'START AT KHU KHOT',
      builtWith: 'Built with OpenCode + DeepSeek V4.1 Flash',
      introHint: 'Best with headphones · WASD / arrows to drive · 1–4 cameras',
      brandSub: 'Bangkok Skytrain · Driver Simulator',
      nextStation: 'NEXT STATION', liveTelemetry: 'LIVE TELEMETRY', kmh: 'KM/H',
      manual: 'MANUAL', auto: 'AUTO PILOT', doorsClosed: 'DOORS CLOSED', doorsOpen: 'DOORS OPEN',
      distance: 'DISTANCE', eta: 'ETA', zone: 'ZONE', interchange: 'INTERCHANGE', nearby: 'NEARBY',
      lineMap: 'LINE MAP', clickStation: 'Click a station to jump the train.',
      driverCab: 'DRIVER CAB', closeDoors: 'CLOSE DOORS TO DEPART', cabHint: 'DRAG TO LOOK · 1–4 CAMERAS',
      passengerTip: 'Sit back · Bangkok rolls past the window',
      throttle: 'THROTTLE', serviceBrake: 'SERVICE BRAKE', emergency: 'EMERGENCY', autoPilot: 'AUTO PILOT',
      doors: 'DOORS', horn: 'HORN', cabView: 'CAB', windowView: 'WINDOW', orbitView: 'ORBIT',
      platformView: 'PLATFORM', nextStop: 'NEXT STOP',
      helpTitle: 'How to drive the Sukhumvit Line', controls: 'CONTROLS',
      helpThrottle: 'Increase throttle', helpBrake: 'Service brake / reduce speed',
      helpEmergency: 'Emergency brake', helpAuto: 'Auto pilot on / off',
      helpDoors: 'Open / close doors at a platform', helpHorn: 'Horn',
      helpCameras: 'Cab / window / orbit / platform camera', helpLang: 'English ⇄ ไทย',
      helpMute: 'Mute / unmute', helpFullscreen: 'Fullscreen', helpReverse: 'Reverse direction at a terminus', helpRain: 'Rain / storm',
      theLine: 'THE LINE',
      helpLine: 'The Sukhumvit Line runs 47 stations from Khu Khot (N24) in the north to Kheha (E23) in Samut Prakan. The simulation compresses the route into a continuous elevated viaduct and scales distances for playability. N6 Sena Ruam, an unopened infill station, is not included.',
      zonesTitle: 'FOUR CITY ZONES',
      zoneA: 'Northern suburbs · shop houses, Chatuchak green',
      zoneB: 'Central core · skyscrapers, Siam skywalks',
      zoneC: 'Sukhumvit · condos, hotels, neon sois',
      zoneD: 'Southern delta · industry, coast, Erawan',
      creditsTitle: 'CREDITS',
      creditsBody: 'Built with OpenCode 2.2.5 and DeepSeek V4.1 Flash (opencode-go/deepseek-v4.1-flash). Three.js r128 + OrbitControls (MIT). No image, audio or model assets: every building, train, sign and sound is generated in the browser.',
      close: 'CLOSE',
      audioMixer: 'AUDIO MIXER', engineSound: 'ENGINE', announcements: 'ANNOUNCEMENTS', music: 'MUSIC',
      musicOn: 'MUSIC ON', musicOff: 'MUSIC OFF', musicOnToast: 'Transit music enabled.', musicOffToast: 'Transit music muted.',
      testPA: 'TEST PA', mixerHint: 'Bilingual Thai / English station announcements. Lower the engine to hear the PA clearly.',
      paVoiceOn: 'PA VOICE ON', paVoiceOff: 'PA VOICE OFF', touristOn: 'TOURIST INFO ON', touristOff: 'TOURIST INFO OFF',
      voiceOnToast: 'PA voice enabled.', voiceOffToast: 'PA voice muted.', touristOnToast: 'Tourist commentary enabled.', touristOffToast: 'Tourist commentary disabled.',
      rainOn: 'Bangkok storm · rain and thunder.', rainOff: 'Rain cleared.',
      doorsLocked: 'Doors locked while the train is moving.', notAtStation: 'Doors can only open at a platform.',
      doorsOpening: 'Doors opening · passengers boarding and alighting.', doorsClosing: 'Doors closing · stand clear.',
      autoOn: 'Auto pilot engaged · next stop {station}.', autoOff: 'Manual control · you have the train.',
      brakeOn: 'Service brake applied.', brakeOff: 'Service brake released.',
      emergencyStop: 'EMERGENCY BRAKE · train stopped.', terminusReversed: 'Terminus · direction reversed. Next stop {station}.',
      arrived: 'Now arriving at {station}.', nextAnnounce: 'Next station: {station}.',
      jumpStation: 'Jumped to {station}.', welcome: 'Welcome aboard · {station}.',
      audioOff: 'Sound muted.', audioOn: 'Sound on.', todDay: 'Daylight', todDusk: 'Golden hour', todNight: 'Night',
      interchanges: 'Interchange · {lines}', terminus: 'Terminus', doorsOpenAt: 'Doors open · {station}',
      speedLimit: 'Speed limit 100 km/h', ready: 'Ready to depart · {station}',
      autoArriving: 'Auto pilot braking into {station}.', autoDepart: 'Auto pilot departing {station}.',
      noInterchange: 'No rail interchange', platformCam: 'PLATFORM CAM', arrivingIn: 'ARRIVING IN {time}',
      stationAhead: '{station} ahead', passed: 'Passed {station}', reverseHint: 'Press R to reverse at the terminus.',
      langName: 'English', restart: 'Re-centre camera'
    },
    th: {
      introCopy: 'ขึ้นห้องคนขับรถไฟลอยฟ้า BTS สี่ตู้ วิ่ง 47 สถานีจากคูคตถึงเคหะฯ ผ่านชานเมืองร้านแถว ตึกระฟ้าสยาม ย่านสุขุมวิทนีออน และที่ราบปากน้ำ',
      stations: 'สถานี', zones: 'โซนเมือง', cameras: 'กล้อง', railPower: 'รางที่สาม',
      boardSiam: 'ขึ้นรถที่สยาม', startKhuKhot: 'เริ่มที่คูคต',
      builtWith: 'สร้างด้วย OpenCode + DeepSeek V4.1 Flash',
      introHint: 'แนะนำใส่หูฟัง · WASD / ลูกศร ขับรถ · ปุ่ม 1–4 กล้อง',
      brandSub: 'รถไฟฟ้าบีทีเอส · โปรแกรมขับรถไฟ',
      nextStation: 'สถานีต่อไป', liveTelemetry: 'ข้อมูลสด', kmh: 'กม./ชม.',
      manual: 'ขับเอง', auto: 'อัตโนมัติ', doorsClosed: 'ประตูปิด', doorsOpen: 'ประตูเปิด',
      distance: 'ระยะทาง', eta: 'ถึงใน', zone: 'โซน', interchange: 'เปลี่ยนสาย', nearby: 'ใกล้เคียง',
      lineMap: 'แผนที่เส้นทาง', clickStation: 'คลิกสถานีเพื่อย้ายรถไฟ',
      driverCab: 'ห้องคนขับ', closeDoors: 'ปิดประตูก่อนออกรถ', cabHint: 'ลากเพื่อมอง · กล้อง 1–4',
      passengerTip: 'นั่งชมกรุงเทพฯ เคลื่อนผ่านหน้าต่าง',
      throttle: 'คันเร่ง', serviceBrake: 'เบรกบริการ', emergency: 'เบรกฉุกเฉิน', autoPilot: 'อัตโนมัติ',
      doors: 'ประตู', horn: 'แตร', cabView: 'คนขับ', windowView: 'หน้าต่าง', orbitView: 'รอบนอก',
      platformView: 'ชานชาลา', nextStop: 'สถานีถัดไป',
      helpTitle: 'วิธีขับรถไฟฟ้าสายสุขุมวิท', controls: 'ปุ่มควบคุม',
      helpThrottle: 'เพิ่มความเร็ว', helpBrake: 'เบรกบริการ / ลดความเร็ว',
      helpEmergency: 'เบรกฉุกเฉิน', helpAuto: 'เปิด / ปิดโหมดอัตโนมัติ',
      helpDoors: 'เปิด / ปิดประตูที่ชานชาลา', helpHorn: 'แตร',
      helpCameras: 'กล้องคนขับ / หน้าต่าง / รอบนอก / ชานชาลา', helpLang: 'English ⇄ ไทย',
      helpMute: 'ปิด / เปิดเสียง', helpFullscreen: 'เต็มจอ', helpReverse: 'กลับทิศทางที่สถานีปลายทาง', helpRain: 'ฝน / พายุ',
      theLine: 'เส้นทาง',
      helpLine: 'สายสุขุมวิทมี 47 สถานี จากคูคต (N24) ทางเหนือถึงเคหะฯ (E23) ในสมุทรปราการ เกมนี้ย่อเส้นทางเป็นทางลอยฟ้าต่อเนื่องและปรับระยะทางให้เล่นสนุก โดยไม่รวมสถานี N6 เสนารวมที่ยังไม่เปิด',
      zonesTitle: 'สี่โซนเมือง',
      zoneA: 'ชานเมืองเหนือ · ร้านแถว สวนจตุจักร',
      zoneB: 'ศูนย์กลาง · ตึกระฟ้า สกายวอล์คสยาม',
      zoneC: 'สุขุมวิท · คอนโด โรงแรม ซอยนีออน',
      zoneD: 'ปากน้ำ · อุตสาหกรรม ชายฝั่ง เอราวัณ',
      creditsTitle: 'เครดิต',
      creditsBody: 'สร้างด้วย OpenCode 2.2.5 และ DeepSeek V4.1 Flash (opencode-go/deepseek-v4.1-flash) ใช้ Three.js r128 + OrbitControls (MIT) ไม่มีไฟล์ภาพ เสียง หรือโมเดลสำเร็จรูป ทุกอาคาร รถไฟ ป้าย และเสียงสร้างในเบราว์เซอร์',
      close: 'ปิด',
      audioMixer: 'มิกซ์เสียง', engineSound: 'เสียงเครื่องยนต์', announcements: 'เสียงประกาศ', music: 'เพลงบรรเลง',
      musicOn: 'เพลงเปิด', musicOff: 'เพลงปิด', musicOnToast: 'เปิดเพลงบรรเลงแล้ว', musicOffToast: 'ปิดเพลงบรรเลงแล้ว',
      testPA: 'ทดสอบประกาศ', mixerHint: 'ประกาศสถานีสองภาษา ไทย / อังกฤษ ลดเสียงเครื่องยนต์เพื่อฟังประกาศให้ชัด',
      paVoiceOn: 'เสียงประกาศเปิด', paVoiceOff: 'เสียงประกาศปิด', touristOn: 'ข้อมูลท่องเที่ยวเปิด', touristOff: 'ข้อมูลท่องเที่ยวปิด',
      voiceOnToast: 'เปิดเสียงประกาศแล้ว', voiceOffToast: 'ปิดเสียงประกาศแล้ว', touristOnToast: 'เปิดข้อมูลท่องเที่ยวแล้ว', touristOffToast: 'ปิดข้อมูลท่องเที่ยวแล้ว',
      rainOn: 'พายุฝนกรุงเทพฯ · ฝนและฟ้าร้อง', rainOff: 'ฝนหยุดแล้ว',
      doorsLocked: 'ประตูล็อกขณะรถไฟเคลื่อนที่', notAtStation: 'เปิดประตูได้ที่ชานชาลาเท่านั้น',
      doorsOpening: 'ประตูกำลังเปิด · ผู้โดยสารขึ้นและลงรถ', doorsClosing: 'ประตูกำลังปิด · กรุณาถอย',
      autoOn: 'เปิดโหมดอัตโนมัติ · สถานีต่อไป {station}', autoOff: 'ควบคุมเอง · คุณถือพวงมาลัย',
      brakeOn: 'ใช้เบรกบริการ', brakeOff: 'ปล่อยเบรกบริการ',
      emergencyStop: 'เบรกฉุกเฉิน · รถหยุดแล้ว', terminusReversed: 'ปลายทาง · กลับทิศทางแล้ว สถานีต่อไป {station}',
      arrived: 'กำลังถึงสถานี {station}', nextAnnounce: 'สถานีต่อไป {station}',
      jumpStation: 'ย้ายไปสถานี {station}', welcome: 'ยินดีต้อนรับ · {station}',
      audioOff: 'ปิดเสียง', audioOn: 'เปิดเสียง', todDay: 'กลางวัน', todDusk: 'แสงทอง', todNight: 'กลางคืน',
      interchanges: 'เปลี่ยนสาย · {lines}', terminus: 'สถานีปลายทาง', doorsOpenAt: 'ประตูเปิด · {station}',
      speedLimit: 'จำกัดความเร็ว 100 กม./ชม.', ready: 'พร้อมออกจากสถานี {station}',
      autoArriving: 'อัตโนมัติกำลังเบรกเข้าสถานี {station}', autoDepart: 'อัตโนมัติออกจากสถานี {station}',
      noInterchange: 'ไม่มีรถไฟสายอื่น', platformCam: 'กล้องชานชาลา', arrivingIn: 'จะถึงใน {time}',
      stationAhead: 'ข้างหน้า {station}', passed: 'ผ่านสถานี {station}', reverseHint: 'กด R เพื่อกลับทิศทางที่ปลายทาง',
      langName: 'ไทย', restart: 'จัดกล้องใหม่'
    }
  };

  /* ---------------------------------------------------------------------------
     Small helpers
     ------------------------------------------------------------------------ */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const t = (key) => (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
  const fill = (str, vars) => String(str).replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : '');
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function formatDistance(m) {
    if (m >= 1000) return (m / 1000).toFixed(2) + ' km';
    return Math.max(0, Math.round(m)) + ' m';
  }

  function formatEta(sec) {
    if (!isFinite(sec) || sec <= 0) return '--';
    if (sec < 60) return Math.round(sec) + 's';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m + 'm ' + String(s).padStart(2, '0') + 's';
  }

  function hexCss(hex) {
    return '#' + Number(hex).toString(16).padStart(6, '0');
  }

  function makeCanvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    draw(ctx, w, h);
    return c;
  }

  function canvasTexture(canvas, repeatX, repeatY) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    if (repeatX || repeatY) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX || 1, repeatY || 1);
    }
    return tex;
  }

  function makeGradientTexture(top, bottom) {
    return canvasTexture(makeCanvas(8, 128, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }));
  }

  function makeAsphaltTexture() {
    return canvasTexture(makeCanvas(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#202522';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        const v = Math.random();
        ctx.fillStyle = v > 0.5
          ? 'rgba(255,255,255,' + (0.012 + Math.random() * 0.035).toFixed(3) + ')'
          : 'rgba(0,0,0,' + (0.02 + Math.random() * 0.08).toFixed(3) + ')';
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
      ctx.fillStyle = 'rgba(225,225,205,0.62)';
      ctx.fillRect(8, 0, 5, h);
      ctx.fillRect(w - 13, 0, 5, h);
      ctx.fillStyle = 'rgba(230,198,88,0.72)';
      ctx.fillRect(w / 2 - 7, 0, 4, h);
      ctx.fillRect(w / 2 + 3, 0, 4, h);
      for (const x of [w * 0.25, w * 0.75]) {
        for (let y = 0; y < h; y += 52) {
          ctx.fillStyle = 'rgba(225,225,210,0.5)';
          ctx.fillRect(x - 2, y, 4, 26);
        }
      }
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      for (let i = 0; i < 18; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 12 + Math.random() * 45, 2 + Math.random() * 5);
      }
    }), 1, 1);
  }

  function makePavingTexture() {
    return canvasTexture(makeCanvas(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#74776b';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 3500; i++) {
        const v = Math.random();
        ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.055)';
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
      ctx.strokeStyle = 'rgba(42,48,42,0.36)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= w; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y <= h; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let y = 0; y <= h; y += 32) ctx.fillRect(0, y + 1, w, 1);
    }), 1, 1);
  }

  /* ---------------------------------------------------------------------------
     Global state and DOM cache
     ------------------------------------------------------------------------ */

  const state = {
    ready: false,
    started: false,
    lang: 'en',
    view: 1,
    tod: 'day',
    muted: false,
    engineVolume: 0.15,
    paVolume: 1.0,
    musicVolume: 0.18,
    musicEnabled: true,
    voiceEnabled: true,
    touristInfo: true,
    voiceUnlocked: false,
    speechTimer: null,
    speechToken: 0,
    lastSpeech: '',
    firstAnnouncement: false,
    rain: false,
    lightningTimer: 0,
    speed: 0,
    throttle: 0,
    brake: false,
    emergency: false,
    auto: false,
    doorsOpen: false,
    doorAnim: 0,
    distance: 0,
    direction: 1,
    currentIndex: 23,
    nextIndex: 24,
    atStation: false,
    dwell: 0,
    autoState: 'idle',
    autoTarget: 0,
    autoDist: 0,
    autoDt: 0,
    lastJoint: 0,
    travelled: 0,
    lastAnnouncedNext: -1,
    lastArrival: -1,
    cabYaw: 0,
    cabPitch: 0,
    dragging: false,
    pointer: { x: 0, y: 0 },
    introMode: true,
    stationCamIndex: -1,
    orbitTarget: new THREE.Vector3(),
    orbitLast: new THREE.Vector3(),
    time: 0,
    fps: 0,
    frameCount: 0,
    fpsTimer: 0,
    lastHud: 0,
    lastMap: 0,
    lastStationList: -1
  };

  const dom = {};
  let scene, camera, renderer, controls;
  let routeCurve, routeLengthWorld = 1, displayTotal = 1;
  let stationPositions = [];
  let stationTangents = [];
  let stationU = [];
  let stationSignals = [];
  let trainRoot, cars = [], doorPanels = [];
  let skyMat, sunLight, hemiLight, ambientLight;
  let buildingMat, lowriseMat, glassMat, windowTex, windowLitTex;
  let lowriseMesh = null;
  let neonMats = [], billboardMats = [], headlightMats = [];
  let traffic = [];
  let trainHeadlights = [];
  let minimapCtx;
  let audio = null;
  let rainRoot = null;
  let rainGeo = null;
  let rainData = [];
  const RAIN_COUNT = 900;
  let dynamicPeds = [];
  let selftestResults = [];

  function cacheDom() {
    const ids = [
      'loadingScreen', 'loadingBar', 'loadingCopy', 'intro', 'startSiam', 'startKhuKhot',
      'introLang', 'langBtn', 'todBtn', 'rainBtn', 'audioBtn', 'mixBtn', 'helpBtn', 'fullscreenBtn',
      'audioMixer', 'mixClose', 'engineVol', 'engineVolVal', 'paVol', 'paVolVal',
      'musicVol', 'musicVolVal', 'voiceToggle', 'touristToggle', 'musicToggle', 'testPA', 'lightning',
      'announce', 'announceKicker', 'announceName', 'announceDetail', 'announceDetailTh',
      'telemetry', 'telemetryToggle', 'speedRing', 'speedValue', 'modeChip', 'doorChip',
      'tractionBars', 'signalChip', 'nextCode', 'nextName', 'nextThai', 'distanceValue',
      'etaValue', 'zoneValue', 'routeProgress', 'zoneChip', 'zoneDesc', 'interchangeChips',
      'landmarkName', 'minimap', 'routePanel', 'routeToggle', 'stationList',
      'cabSpeed', 'cabSignal', 'cabSignalText', 'cabDoor', 'cabWarning', 'cabOverlay',
      'passengerStation', 'stationCamName', 'stationCamEta',
      'throttle', 'throttleValue', 'brakeBtn', 'emergencyBtn', 'autoBtn', 'doorBtn', 'hornBtn',
      'skipBtn', 'toasts', 'helpModal', 'helpClose', 'helpOk', 'versionLabel', 'selftestOut'
    ];
    ids.forEach((id) => { dom[id] = document.getElementById(id); });
    dom.viewButtons = $$('.view-btn');
    dom.throttleBars = $$('#tractionBars i');
  }

  /* ---------------------------------------------------------------------------
     Boot sequence
     ------------------------------------------------------------------------ */

  async function boot() {
    cacheDom();
    dom.versionLabel.textContent = 'v' + VERSION;
    if (typeof THREE === 'undefined') {
      showBootError('Three.js could not be loaded. Check the CDN connection and reload.');
      return;
    }
    try {
      setLoading(6, 'Starting the WebGL renderer…');
      await nextFrame();
      initThree();
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (e) { /* fallback fonts */ }
      }

      setLoading(18, 'Surveying the 47-station alignment…');
      await nextFrame();
      buildRoute();

      setLoading(32, 'Pouring the elevated viaduct…');
      await nextFrame();
      buildGroundAndViaduct();

      setLoading(48, 'Raising Bangkok’s four city zones…');
      await nextFrame();
      buildCity();

      setLoading(64, 'Building the 47 BTS platforms…');
      await nextFrame();
      buildStations();

      setLoading(76, 'Placing Victory Monument, Siam and Erawan…');
      await nextFrame();
      buildLandmarks();

      setLoading(86, 'Rolling out the four-car train…');
      await nextFrame();
      buildTrain();

      setLoading(93, 'Wiring bilingual telemetry and audio…');
      await nextFrame();
      buildHUD();
      initAudio();
      bindEvents();

      setLoading(100, 'Ready on the Sukhumvit Line.');
      finishBoot();
    } catch (err) {
      console.error(err);
      window.__BOOT_ERROR = String(err && err.stack || err);
      showBootError('The simulator hit a build error: ' + err.message);
    }
  }

  function setLoading(pct, copy) {
    if (dom.loadingBar) dom.loadingBar.style.width = pct + '%';
    if (dom.loadingCopy && copy) dom.loadingCopy.textContent = copy;
  }

  function showBootError(message) {
    if (dom.loadingCopy) {
      dom.loadingCopy.textContent = message;
      dom.loadingCopy.style.color = '#ff8fa2';
    }
    if (dom.loadingBar) {
      dom.loadingBar.style.width = '100%';
      dom.loadingBar.style.background = '#ff5d75';
    }
  }

  function finishBoot() {
    state.ready = true;
    dom.loadingScreen.classList.add('is-hidden');

    const stationParam = (PARAMS.get('station') || '').toUpperCase();
    let startIndex = STATIONS.findIndex((s) => s.code === stationParam);
    if (startIndex < 0) startIndex = 23; // Siam CEN

    setStation(startIndex, { silent: true });
    setTimeOfDay(PARAMS.get('tod') || 'day', true);
    if (PARAMS.get('rain') === '1' || PARAMS.has('rain')) setRain(true, true);

    const viewParam = parseInt(PARAMS.get('view') || '0', 10);
    if (viewParam >= 1 && viewParam <= 4) setView(viewParam, true);

    if (AUTOSTART) {
      dom.intro.classList.add('is-hidden');
      state.introMode = false;
      state.started = true;
      setView(viewParam >= 1 && viewParam <= 4 ? viewParam : 3, true);
      if (IS_SELFTEST) setTimeout(runSelfTests, 900);
      else if (PARAMS.has('auto')) setAuto(true, true);
      announceStation(true);
    } else {
      state.introMode = true;
      setView(3, true);
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
    }

    if (window.innerWidth <= 900) {
      document.body.classList.add('telemetry-min');
      dom.telemetryToggle.textContent = '+';
      dom.telemetryToggle.setAttribute('aria-expanded', 'false');
    }

    renderStationList();
    updateHUD(true);
    requestAnimationFrame(animate);
  }

  function startSimulation(index) {
    setStation(index, { silent: true });
    state.introMode = false;
    state.started = true;
    dom.intro.classList.add('is-hidden');
    controls.autoRotate = false;
    setView(1, true);
    ensureAudio();
    state.firstAnnouncement = true;
    toast(fill(t('welcome'), { station: STATIONS[index].en + ' (' + STATIONS[index].code + ')' }), 'gold');
    announceStation(true);
    updateHUD(true);
  }

  /* ---------------------------------------------------------------------------
     Three.js foundation
     ------------------------------------------------------------------------ */

  const FORWARD_Z = new THREE.Vector3(0, 0, 1);
  let sunSprite = null;
  let starField = null;
  let routeSamples = [];
  let buildingMesh = null, glassMesh = null, roofMesh = null, antennaMesh = null;
  let treeTrunkMesh = null, treeLeafMesh = null;
  let pedestrianBodyMesh = null, pedestrianHeadMesh = null;

  function initThree() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xa9c3bf, 380, 2700);

    camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.08, 16000);
    camera.position.set(32, 26, 42);

    const canvas = document.getElementById('scene');
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.76;
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.touchAction = 'none';

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 220;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.autoRotateSpeed = 0.35;
    controls.enabled = false;

    // Gradient sky dome
    skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0f5a8c) },
        bottomColor: { value: new THREE.Color(0xb7d2d0) },
        offset: { value: 220 },
        exponent: { value: 0.72 }
      },
      vertexShader: [
        'varying vec3 vWorldPosition;',
        'void main() {',
        '  vec4 worldPosition = modelMatrix * vec4(position, 1.0);',
        '  vWorldPosition = worldPosition.xyz;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 topColor;',
        'uniform vec3 bottomColor;',
        'uniform float offset;',
        'uniform float exponent;',
        'varying vec3 vWorldPosition;',
        'void main() {',
        '  float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;',
        '  gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);',
        '}'
      ].join('\n'),
      side: THREE.BackSide,
      depthWrite: false
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(7000, 32, 18), skyMat);
    sky.name = 'SkyDome';
    scene.add(sky);

    // Sun sprite
    const sunCanvas = makeCanvas(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,240,1)');
      g.addColorStop(0.16, 'rgba(255,244,190,0.95)');
      g.addColorStop(0.42, 'rgba(255,210,110,0.34)');
      g.addColorStop(1, 'rgba(255,190,80,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: canvasTexture(sunCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    sunSprite.scale.set(520, 520, 1);
    sunSprite.position.set(900, 1250, -1500);
    scene.add(sunSprite);

    const starPositions = [];
    for (let i = 0; i < 700; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 5600;
      const x = Math.sin(phi) * Math.cos(theta) * r;
      const y = Math.abs(Math.cos(phi)) * r * 0.85 + 120;
      const z = Math.sin(phi) * Math.sin(theta) * r;
      starPositions.push(x, y, z);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starField = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 2.2, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true
    }));
    scene.add(starField);

    hemiLight = new THREE.HemisphereLight(0xc6e2f0, 0x3f5040, 0.45);
    scene.add(hemiLight);

    ambientLight = new THREE.AmbientLight(0xffffff, 0.12);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xffefc4, 0.9);
    sunLight.position.set(420, 780, 260);
    scene.add(sunLight);

    const fill = new THREE.DirectionalLight(0x9fd8ff, 0.18);
    fill.position.set(-400, 300, -500);
    scene.add(fill);

    window.addEventListener('resize', onResize, { passive: true });
  }

  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  }

  /* ---------------------------------------------------------------------------
     Route survey
     ------------------------------------------------------------------------ */

  function buildRoute() {
    const pts = [
      [0, -3700], [18, -3440], [42, -3180], [66, -2920], [92, -2670],
      [120, -2430], [150, -2200], [158, -1960], [132, -1730], [78, -1510],
      [8, -1320], [-64, -1140], [-66, -940], [0, -760], [108, -610],
      [228, -490], [356, -390], [462, -270], [524, -120], [540, 40],
      [510, 205], [438, 360], [338, 505], [222, 645], [100, 785],
      [-30, 925], [-155, 1065], [-270, 1205], [-372, 1345], [-468, 1485],
      [-566, 1625], [-660, 1765], [-748, 1905], [-826, 2045], [-884, 2190],
      [-922, 2335], [-946, 2485], [-960, 2640], [-968, 2800]
    ].map(([x, z]) => new THREE.Vector3(x, 0, z));

    routeCurve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.36);
    routeLengthWorld = Math.max(1, routeCurve.getLength());
    displayTotal = routeLengthWorld / WORLD_PER_M;

    // Chainages: realistic zone-weighted station spacing, normalised to the route.
    const baseGap = { A: 1.22, B: 0.96, C: 0.82, D: 1.22 };
    const weights = STATIONS.map((s, i) => baseGap[s.zone] * (0.88 + ((i * 7) % 5) * 0.055));
    const cumulative = [0];
    for (let i = 1; i < weights.length; i++) cumulative[i] = cumulative[i - 1] + weights[i];
    const usable = displayTotal - 160;

    stationPositions = [];
    stationTangents = [];
    stationU = [];
    STATIONS.forEach((s, i) => {
      const chainage = 80 + (cumulative[i] / cumulative[cumulative.length - 1]) * usable;
      s.chainage = chainage;
      const u = clamp((chainage * WORLD_PER_M) / routeLengthWorld, 0, 1);
      stationU[i] = u;
      const p = routeCurve.getPointAt(u);
      p.y = 0;
      stationPositions[i] = p;
      const tan = routeCurve.getTangentAt(u);
      tan.y = 0;
      tan.normalize();
      stationTangents[i] = tan;
    });

    routeSamples = routeCurve.getSpacedPoints(900);
    routeSamples.forEach((p) => { p.y = 0; });
  }

  function routePointAtDisplay(meters, target) {
    const u = clamp((meters * WORLD_PER_M) / routeLengthWorld, 0, 1);
    const p = target || new THREE.Vector3();
    routeCurve.getPointAt(u, p);
    p.y = 0;
    return p;
  }

  function routeTangentAtDisplay(meters, target) {
    const u = clamp((meters * WORLD_PER_M) / routeLengthWorld, 0, 1);
    const tan = target || new THREE.Vector3();
    routeCurve.getTangentAt(u, tan);
    tan.y = 0;
    tan.normalize();
    return tan;
  }

  function stationNormal(index, target) {
    const tan = stationTangents[index];
    const n = target || new THREE.Vector3();
    n.set(tan.z, 0, -tan.x);
    return n;
  }

  function stationPoint(index, offset, along) {
    const p = stationPositions[index];
    const tan = stationTangents[index];
    const n = stationNormal(index);
    return new THREE.Vector3(
      p.x + n.x * offset + tan.x * along,
      0,
      p.z + n.z * offset + tan.z * along
    );
  }

  function routeDistanceSq(x, z) {
    let min = Infinity;
    for (let i = 0; i < routeSamples.length; i += 2) {
      const dx = x - routeSamples[i].x;
      const dz = z - routeSamples[i].z;
      const d = dx * dx + dz * dz;
      if (d < min) min = d;
    }
    return min;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function makeRibbon(width, y, color, opacity) {
    const segments = 700;
    const positions = [];
    const uvs = [];
    const indices = [];
    const p = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      routeCurve.getPointAt(u, p);
      routeCurve.getTangentAt(u, tan);
      tan.y = 0;
      tan.normalize();
      n.set(tan.z, 0, -tan.x);
      positions.push(p.x + n.x * width / 2, y, p.z + n.z * width / 2);
      positions.push(p.x - n.x * width / 2, y, p.z - n.z * width / 2);
      uvs.push(0, i / 8, 1, i / 8);
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({
      color,
      transparent: opacity != null && opacity < 1,
      opacity: opacity == null ? 1 : opacity,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = false;
    return mesh;
  }

  function offsetRouteCurve(offset, y) {
    const points = [];
    const p = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const n = new THREE.Vector3();
    const count = 620;
    for (let i = 0; i <= count; i++) {
      const u = i / count;
      routeCurve.getPointAt(u, p);
      routeCurve.getTangentAt(u, tan);
      tan.y = 0;
      tan.normalize();
      n.set(tan.z, 0, -tan.x);
      points.push(new THREE.Vector3(p.x + n.x * offset, y, p.z + n.z * offset));
    }
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2);
  }

  function makeTube(curve, radius, color, emissive, segments) {
    const geo = new THREE.TubeGeometry(curve, segments || 900, radius, 5, false);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.32,
      metalness: 0.82,
      emissive: emissive || 0x000000,
      emissiveIntensity: emissive ? 0.9 : 0
    });
    return new THREE.Mesh(geo, mat);
  }

  /* ---------------------------------------------------------------------------
     Ground, road, viaduct and third rail
     ------------------------------------------------------------------------ */

  function buildGroundAndViaduct() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(17000, 17000),
      new THREE.MeshLambertMaterial({ color: 0x3f5238 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    ground.name = 'Ground';
    scene.add(ground);

    // Chao Phraya / coastal delta water to the south-east.
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(15000, 6200),
      new THREE.MeshLambertMaterial({ color: 0x2e6d79, transparent: true, opacity: 0.92 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(600, -0.04, 4350);
    water.name = 'GulfOfThailand';
    scene.add(water);

    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(520, 9000),
      new THREE.MeshLambertMaterial({ color: 0x2e6d79, transparent: true, opacity: 0.86 })
    );
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = 0.18;
    river.position.set(-2400, -0.02, 900);
    scene.add(river);

    const coast = new THREE.Mesh(
      new THREE.PlaneGeometry(15000, 60),
      new THREE.MeshLambertMaterial({ color: 0xb9ab85 })
    );
    coast.rotation.x = -Math.PI / 2;
    coast.position.set(500, 0.01, 1260);
    scene.add(coast);

    // Sidewalk / road corridor beneath the viaduct.
    const sidewalk = makeRibbon(22, 0.02, 0xffffff, 1);
    sidewalk.name = 'Sidewalks';
    sidewalk.material.map = makePavingTexture();
    sidewalk.material.color.setHex(0xb0b1a5);
    sidewalk.material.polygonOffset = true;
    sidewalk.material.polygonOffsetFactor = -1;
    sidewalk.material.polygonOffsetUnits = -1;
    sidewalk.material.needsUpdate = true;
    scene.add(sidewalk);

    const road = makeRibbon(15, 0.12, 0xffffff, 1);
    road.name = 'SukhumvitRoad';
    road.material.map = makeAsphaltTexture();
    road.material.color.setHex(0xffffff);
    road.material.polygonOffset = true;
    road.material.polygonOffsetFactor = -2;
    road.material.polygonOffsetUnits = -2;
    road.material.needsUpdate = true;
    scene.add(road);

    // Soft shade beneath the viaduct keeps the road from looking flat and glowing.
    const underShade = makeRibbon(12, 0.17, 0x000000, 0.2);
    underShade.material.depthWrite = false;
    underShade.material.polygonOffset = true;
    underShade.material.polygonOffsetFactor = -3;
    underShade.material.polygonOffsetUnits = -3;
    underShade.renderOrder = 1;
    scene.add(underShade);

    const dummy = new THREE.Object3D();
    const p = new THREE.Vector3();
    const tan = new THREE.Vector3();

    // Raised curbs between the road and the paved footways.
    const curbCount = Math.floor(routeLengthWorld / 6);
    const curbGeo = new THREE.BoxGeometry(1, 1, 1);
    const curbMat = new THREE.MeshLambertMaterial({ color: 0x8b8c80 });
    const curbs = new THREE.InstancedMesh(curbGeo, curbMat, curbCount * 2);
    for (let i = 0; i < curbCount; i++) {
      const u = (i * 6 + 3) / routeLengthWorld;
      routeCurve.getPointAt(Math.min(1, u), p);
      routeCurve.getTangentAt(Math.min(1, u), tan);
      tan.y = 0;
      tan.normalize();
      const n = new THREE.Vector3(tan.z, 0, -tan.x);
      for (const side of [-1, 1]) {
        dummy.position.set(p.x + n.x * side * 7.65, 0.22, p.z + n.z * side * 7.65);
        dummy.quaternion.setFromUnitVectors(FORWARD_Z, tan);
        dummy.scale.set(0.34, 0.2, 6.1);
        dummy.updateMatrix();
        curbs.setMatrixAt(i * 2 + (side > 0 ? 1 : 0), dummy.matrix);
      }
    }
    curbs.instanceMatrix.needsUpdate = true;
    curbs.frustumCulled = false;
    scene.add(curbs);

    // Viaduct deck.
    const deck = makeRibbon(8.1, TRACK_Y, 0x7f877f, 1);
    deck.name = 'ViaductDeck';
    scene.add(deck);
    const deckUnder = makeRibbon(6.7, TRACK_Y - 0.92, 0x5d665e, 1);
    scene.add(deckUnder);

    // Side parapets and green line.
    const wallCount = Math.floor(routeLengthWorld / 4);
    const wallGeo = new THREE.BoxGeometry(1, 1, 1);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x7a837a });
    const walls = new THREE.InstancedMesh(wallGeo, wallMat, wallCount * 2);
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0x00a651, emissive: 0x00381d, emissiveIntensity: 0.35 });
    const stripes = new THREE.InstancedMesh(wallGeo, stripeMat, wallCount * 2);
    let wi = 0;
    for (let i = 0; i < wallCount; i++) {
      const u = (i * 4 + 2) / routeLengthWorld;
      routeCurve.getPointAt(Math.min(1, u), p);
      routeCurve.getTangentAt(Math.min(1, u), tan);
      tan.y = 0;
      tan.normalize();
      const n = new THREE.Vector3(tan.z, 0, -tan.x);
      for (const side of [-1, 1]) {
        dummy.position.set(p.x + n.x * side * 3.95, TRACK_Y - 0.42, p.z + n.z * side * 3.95);
        dummy.quaternion.setFromUnitVectors(FORWARD_Z, tan);
        dummy.scale.set(0.22, 0.9, 4.2);
        dummy.updateMatrix();
        walls.setMatrixAt(wi, dummy.matrix);

        dummy.position.y = TRACK_Y - 0.2;
        dummy.scale.set(0.26, 0.12, 4.2);
        dummy.updateMatrix();
        stripes.setMatrixAt(wi, dummy.matrix);
        wi++;
      }
    }
    walls.instanceMatrix.needsUpdate = true;
    stripes.instanceMatrix.needsUpdate = true;
    walls.frustumCulled = false;
    stripes.frustumCulled = false;
    scene.add(walls);
    scene.add(stripes);

    // Pillars and crossheads.
    const pierCount = Math.floor(routeLengthWorld / 28);
    const pierGeo = new THREE.CylinderGeometry(0.62, 0.82, 1, 8);
    const pierMat = new THREE.MeshLambertMaterial({ color: 0x858d84 });
    const piers = new THREE.InstancedMesh(pierGeo, pierMat, pierCount);
    const capGeo = new THREE.BoxGeometry(1, 1, 1);
    const caps = new THREE.InstancedMesh(capGeo, pierMat, pierCount);
    for (let i = 0; i < pierCount; i++) {
      const u = (i * 28 + 14) / routeLengthWorld;
      routeCurve.getPointAt(Math.min(1, u), p);
      routeCurve.getTangentAt(Math.min(1, u), tan);
      tan.y = 0;
      tan.normalize();
      dummy.position.set(p.x, (TRACK_Y - 1.05) / 2, p.z);
      dummy.quaternion.set(0, 0, 0, 1);
      dummy.scale.set(1, TRACK_Y - 1.05, 1);
      dummy.updateMatrix();
      piers.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p.x, TRACK_Y - 1.05, p.z);
      dummy.quaternion.setFromUnitVectors(FORWARD_Z, tan);
      dummy.scale.set(9.2, 0.5, 1.15);
      dummy.updateMatrix();
      caps.setMatrixAt(i, dummy.matrix);
    }
    piers.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    piers.frustumCulled = false;
    caps.frustumCulled = false;
    scene.add(piers);
    scene.add(caps);

    // Ballastless track bed.
    const bed = makeRibbon(2.9, TRACK_Y + 0.03, 0x3b413d, 1);
    scene.add(bed);

    // Sleepers.
    const tieCount = Math.floor(routeLengthWorld / 3);
    const tieGeo = new THREE.BoxGeometry(1, 1, 1);
    const tieMat = new THREE.MeshLambertMaterial({ color: 0x555d56 });
    const ties = new THREE.InstancedMesh(tieGeo, tieMat, tieCount);
    for (let i = 0; i < tieCount; i++) {
      const u = (i * 3 + 1.5) / routeLengthWorld;
      routeCurve.getPointAt(Math.min(1, u), p);
      routeCurve.getTangentAt(Math.min(1, u), tan);
      tan.y = 0;
      tan.normalize();
      dummy.position.set(p.x, TRACK_Y + 0.075, p.z);
      dummy.quaternion.setFromUnitVectors(FORWARD_Z, tan);
      dummy.scale.set(2.5, 0.07, 0.22);
      dummy.updateMatrix();
      ties.setMatrixAt(i, dummy.matrix);
    }
    ties.instanceMatrix.needsUpdate = true;
    ties.frustumCulled = false;
    scene.add(ties);

    // Running rails and the glowing third rail.
    const railMat = new THREE.MeshStandardMaterial({ color: 0xc4cbc5, roughness: 0.24, metalness: 0.92 });
    for (const offset of [-0.18, 0.18]) {
      const curve = offsetRouteCurve(offset, TRACK_Y + 0.16);
      const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, 850, 0.048, 4, false), railMat);
      scene.add(rail);
    }
    const thirdCurve = offsetRouteCurve(1.16, TRACK_Y + 0.34);
    const thirdRail = makeTube(thirdCurve, 0.07, 0xe0b84b, 0x6b4a00, 850);
    thirdRail.name = 'ThirdRail';
    scene.add(thirdRail);

    // Third-rail cover boards.
    const coverCount = Math.floor(routeLengthWorld / 6);
    const coverGeo = new THREE.BoxGeometry(1, 1, 1);
    const coverMat = new THREE.MeshLambertMaterial({ color: 0x4b4f45 });
    const covers = new THREE.InstancedMesh(coverGeo, coverMat, coverCount);
    for (let i = 0; i < coverCount; i++) {
      const u = (i * 6 + 3) / routeLengthWorld;
      routeCurve.getPointAt(Math.min(1, u), p);
      routeCurve.getTangentAt(Math.min(1, u), tan);
      tan.y = 0;
      tan.normalize();
      const n = new THREE.Vector3(tan.z, 0, -tan.x);
      dummy.position.set(p.x + n.x * 1.16, TRACK_Y + 0.55, p.z + n.z * 1.16);
      dummy.quaternion.setFromUnitVectors(FORWARD_Z, tan);
      dummy.scale.set(0.36, 0.12, 5.9);
      dummy.updateMatrix();
      covers.setMatrixAt(i, dummy.matrix);
    }
    covers.instanceMatrix.needsUpdate = true;
    covers.frustumCulled = false;
    scene.add(covers);

    // A few track-side power cabinets.
    for (let i = 0; i < STATIONS.length; i += 6) {
      const gp = stationPoint(i, 7.2, 14);
      const cabinet = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 1.7, 0.8),
        new THREE.MeshLambertMaterial({ color: 0x67756a })
      );
      cabinet.position.set(gp.x, 0.85, gp.z);
      cabinet.rotation.y = Math.atan2(stationTangents[i].x, stationTangents[i].z);
      scene.add(cabinet);
    }
  }

  /* ---------------------------------------------------------------------------
     Procedural Bangkok city
     ------------------------------------------------------------------------ */

  function makeFacadePair(cols, rows, base, fillRatio) {
    const facadeCanvas = document.createElement('canvas');
    facadeCanvas.width = 192; facadeCanvas.height = 384;
    const litCanvas = document.createElement('canvas');
    litCanvas.width = 192; litCanvas.height = 384;
    const fctx = facadeCanvas.getContext('2d');
    const lctx = litCanvas.getContext('2d');
    const fw = facadeCanvas.width, fh = facadeCanvas.height;
    const cw = fw / cols, ch = fh / rows;
    fctx.fillStyle = base;
    fctx.fillRect(0, 0, fw, fh);
    lctx.fillStyle = '#000000';
    lctx.fillRect(0, 0, fw, fh);
    const ww = cw * fillRatio, wh = ch * fillRatio;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const lit = Math.random();
        fctx.fillStyle = 'rgba(28, 47, 56, 0.84)';
        fctx.fillRect(x * cw + (cw - ww) / 2, y * ch + (ch - wh) / 2, ww, wh);
        if (lit > 0.76) {
          const warm = Math.random() > 0.4;
          lctx.fillStyle = warm
            ? 'rgba(255, 205, 126, ' + (0.4 + Math.random() * 0.48).toFixed(2) + ')'
            : 'rgba(132, 198, 224, ' + (0.32 + Math.random() * 0.4).toFixed(2) + ')';
          lctx.fillRect(x * cw + (cw - ww) / 2, y * ch + (ch - wh) / 2, ww, wh);
        }
      }
    }
    fctx.fillStyle = 'rgba(74, 91, 96, 0.34)';
    for (let y = 0; y <= rows; y++) fctx.fillRect(0, y * ch, fw, 1.1);
    for (let x = 0; x <= cols; x++) fctx.fillRect(x * cw, 0, 0.8, fh);
    fctx.fillStyle = 'rgba(255,255,255,0.2)';
    for (let y = 0; y <= rows; y++) fctx.fillRect(0, y * ch + 1.2, fw, 0.5);
    return { map: canvasTexture(facadeCanvas, 1, 1), lit: canvasTexture(litCanvas, 1, 1) };
  }

  function buildCity() {
    const highFacade = makeFacadePair(14, 40, '#b6bdbd', 0.56);
    const lowFacade = makeFacadePair(8, 10, '#c5c7bf', 0.62);
    windowTex = highFacade.map;
    windowLitTex = highFacade.lit;
    const lowriseTex = lowFacade.map;
    const lowriseLitTex = lowFacade.lit;

    const concreteLow = [];
    const concreteHigh = [];
    const glass = [];
    const roofs = [];
    const antennas = [];
    const treeList = [];
    const palettes = {
      A: [0xd8c7a5, 0xc7b18e, 0xbfc5b3, 0xd9d3bd, 0xb6a78e, 0xe2d8c2, 0xc9b8a0, 0xaeb5a4],
      B: [0xb9c4c7, 0x8e9da4, 0xd6dde0, 0x7f9098, 0xc8d0d0, 0x9aa9b2, 0xe1e6e4, 0x74858d],
      C: [0xe6dcc7, 0xcabba2, 0xd9c2a9, 0xbfc6b7, 0xe8e2d2, 0xb7a78f, 0xd1b49b, 0xaeb8ab],
      D: [0xa9b2ad, 0x8f9b98, 0xc0b59e, 0x9aa6a2, 0x7f8c8b, 0xb4aa93, 0x8b9a96, 0xc8c0ad]
    };
    const glassPalette = [0x6fa8bd, 0x4f91aa, 0x84b9c9, 0x5e8fa7, 0x9ac6d1, 0x3f7f99];
    const dummy = new THREE.Object3D();

    STATIONS.forEach((st, si) => {
      const zone = ZONES[st.zone];
      const p = stationPositions[si];
      const tan = stationTangents[si];
      const n = stationNormal(si);
      const count = zone.count;
      for (let k = 0; k < count; k++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const along = rand(-zone.spread / 2, zone.spread / 2);
        const off = side * rand(zone.near, zone.far);
        const x = p.x + tan.x * along + n.x * off;
        const z = p.z + tan.z * along + n.z * off;
        let w, d, h, color, isGlass = false;
        if (st.zone === 'A') {
          w = rand(2.8, 6.2);
          d = rand(4.2, 9.5);
          h = rand(zone.height[0], zone.height[1]);
          color = pick(palettes.A);
        } else if (st.zone === 'B') {
          isGlass = Math.random() < zone.glass;
          w = isGlass ? rand(5, 12) : rand(4.5, 11);
          d = isGlass ? rand(5, 12) : rand(4.5, 11);
          h = isGlass ? rand(20, 56) : rand(zone.height[0], zone.height[1]);
          color = isGlass ? pick(glassPalette) : pick(palettes.B);
        } else if (st.zone === 'C') {
          isGlass = Math.random() < zone.glass;
          w = rand(4, 9.5);
          d = rand(5, 11);
          h = isGlass ? rand(14, 34) : rand(zone.height[0], zone.height[1]);
          color = isGlass ? pick(glassPalette) : pick(palettes.C);
        } else {
          if (Math.random() < 0.2) {
            w = rand(10, 23);
            d = rand(7, 17);
            h = rand(2.4, 7);
          } else {
            w = rand(4, 10);
            d = rand(5, 12);
            h = rand(zone.height[0], zone.height[1]);
          }
          color = pick(palettes.D);
        }

        const clearance = 13 + Math.max(w, d) * 0.7;
        if (routeDistanceSq(x, z) < clearance * clearance) continue;

        dummy.position.set(x, h / 2, z);
        dummy.quaternion.setFromEuler(new THREE.Euler(0, rand(0, Math.PI), 0));
        dummy.scale.set(w, h, d);
        dummy.updateMatrix();
        (isGlass ? glass : (h < 8 ? concreteLow : concreteHigh)).push({ matrix: dummy.matrix.clone(), color });

        if (h > 4 && Math.random() < 0.68) {
          dummy.position.set(x + rand(-w * 0.16, w * 0.16), h + 0.32, z + rand(-d * 0.16, d * 0.16));
          dummy.scale.set(w * rand(0.22, 0.52), rand(0.35, 0.9), d * rand(0.22, 0.52));
          dummy.updateMatrix();
          roofs.push({ matrix: dummy.matrix.clone(), color: 0x707a71 });
        }
        if (h > 10 && Math.random() < 0.24) {
          const ah = rand(1.2, 5.5);
          dummy.position.set(x, h + ah / 2, z);
          dummy.scale.set(0.09, ah, 0.09);
          dummy.updateMatrix();
          antennas.push({ matrix: dummy.matrix.clone(), color: 0x303733 });
        }
      }

      // Trees around every station, denser in the northern suburbs.
      const treeCount = zone.trees + (st.zone === 'A' ? 3 : 0);
      for (let k = 0; k < treeCount; k++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const along = rand(-zone.spread * 0.55, zone.spread * 0.55);
        const off = side * rand(zone.near + 1, zone.far * 0.72);
        const x = p.x + tan.x * along + n.x * off;
        const z = p.z + tan.z * along + n.z * off;
        if (routeDistanceSq(x, z) < 44) continue;
        treeList.push({ x, z, h: rand(2.2, 6.5), r: rand(1.1, 2.8), color: pick([0x3f6f3b, 0x4d7c42, 0x5c8a4d, 0x376538, 0x6a9354]) });
      }
    });

    buildingMat = new THREE.MeshLambertMaterial({
      map: windowTex,
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveMap: windowLitTex,
      emissiveIntensity: 0.055
    });
    buildingMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), buildingMat, Math.max(1, concreteHigh.length));
    concreteHigh.forEach((b, i) => {
      buildingMesh.setMatrixAt(i, b.matrix);
      buildingMesh.setColorAt(i, new THREE.Color(b.color));
    });
    buildingMesh.instanceMatrix.needsUpdate = true;
    if (buildingMesh.instanceColor) buildingMesh.instanceColor.needsUpdate = true;
    buildingMesh.frustumCulled = false;
    buildingMesh.name = 'CityBuildings';
    scene.add(buildingMesh);

    lowriseMat = new THREE.MeshLambertMaterial({
      map: lowriseTex,
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveMap: lowriseLitTex,
      emissiveIntensity: 0.04
    });
    lowriseMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lowriseMat, Math.max(1, concreteLow.length));
    concreteLow.forEach((b, i) => {
      lowriseMesh.setMatrixAt(i, b.matrix);
      lowriseMesh.setColorAt(i, new THREE.Color(b.color));
    });
    lowriseMesh.instanceMatrix.needsUpdate = true;
    if (lowriseMesh.instanceColor) lowriseMesh.instanceColor.needsUpdate = true;
    lowriseMesh.frustumCulled = false;
    lowriseMesh.name = 'LowriseBuildings';
    scene.add(lowriseMesh);

    glassMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.78,
      shininess: 120,
      specular: 0xc8ecff,
      emissive: 0x0a2530,
      emissiveIntensity: 0.12
    });
    glassMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glassMat, Math.max(1, glass.length));
    glass.forEach((b, i) => {
      glassMesh.setMatrixAt(i, b.matrix);
      glassMesh.setColorAt(i, new THREE.Color(b.color));
    });
    glassMesh.instanceMatrix.needsUpdate = true;
    if (glassMesh.instanceColor) glassMesh.instanceColor.needsUpdate = true;
    glassMesh.frustumCulled = false;
    glassMesh.name = 'GlassTowers';
    scene.add(glassMesh);

    const roofMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    roofMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), roofMat, Math.max(1, roofs.length));
    roofs.forEach((b, i) => {
      roofMesh.setMatrixAt(i, b.matrix);
      roofMesh.setColorAt(i, new THREE.Color(b.color));
    });
    roofMesh.instanceMatrix.needsUpdate = true;
    if (roofMesh.instanceColor) roofMesh.instanceColor.needsUpdate = true;
    roofMesh.frustumCulled = false;
    scene.add(roofMesh);

    const antennaMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    antennaMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), antennaMat, Math.max(1, antennas.length));
    antennas.forEach((b, i) => {
      antennaMesh.setMatrixAt(i, b.matrix);
      antennaMesh.setColorAt(i, new THREE.Color(b.color));
    });
    antennaMesh.instanceMatrix.needsUpdate = true;
    if (antennaMesh.instanceColor) antennaMesh.instanceColor.needsUpdate = true;
    antennaMesh.frustumCulled = false;
    scene.add(antennaMesh);

    buildTrees(treeList);
    buildStreetlights();
    buildBillboards();
    buildParks();
    buildTraffic();
  }

  function buildTrees(treeList) {
    if (!treeList.length) return;
    const trunkGeo = new THREE.CylinderGeometry(0.09, 0.15, 1, 5);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
    const leafGeo = new THREE.IcosahedronGeometry(1, 0);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeList.length);
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, treeList.length);
    const dummy = new THREE.Object3D();
    treeList.forEach((tr, i) => {
      dummy.position.set(tr.x, tr.h / 2, tr.z);
      dummy.quaternion.set(0, 0, 0, 1);
      dummy.scale.set(1, tr.h, 1);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tr.x, tr.h * 0.78, tr.z);
      dummy.quaternion.setFromEuler(new THREE.Euler(rand(-0.3, 0.3), rand(0, Math.PI), rand(-0.2, 0.2)));
      dummy.scale.set(tr.r, tr.r * rand(0.85, 1.25), tr.r);
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
      leaves.setColorAt(i, new THREE.Color(tr.color));
    });
    trunks.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    trunks.frustumCulled = false;
    leaves.frustumCulled = false;
    trunks.name = 'TreeTrunks';
    leaves.name = 'TreeCanopy';
    scene.add(trunks);
    scene.add(leaves);
    treeTrunkMesh = trunks;
    treeLeafMesh = leaves;
  }

  function buildStreetlights() {
    const count = Math.floor(routeLengthWorld / 36);
    const poleGeo = new THREE.CylinderGeometry(0.07, 0.1, 1, 5);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x555d57 });
    const bulbGeo = new THREE.SphereGeometry(0.13, 6, 4);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe6a3 });
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, count * 2);
    const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, count * 2);
    const dummy = new THREE.Object3D();
    const p = new THREE.Vector3();
    const tan = new THREE.Vector3();
    let idx = 0;
    for (let i = 0; i < count; i++) {
      const u = (i * 36 + 12) / routeLengthWorld;
      routeCurve.getPointAt(Math.min(1, u), p);
      routeCurve.getTangentAt(Math.min(1, u), tan);
      tan.y = 0;
      tan.normalize();
      const n = new THREE.Vector3(tan.z, 0, -tan.x);
      for (const side of [-1, 1]) {
        const x = p.x + n.x * side * 11.8;
        const z = p.z + n.z * side * 11.8;
        dummy.position.set(x, 1.75, z);
        dummy.quaternion.set(0, 0, 0, 1);
        dummy.scale.set(1, 3.5, 1);
        dummy.updateMatrix();
        poles.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(x, 3.55, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bulbs.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    poles.instanceMatrix.needsUpdate = true;
    bulbs.instanceMatrix.needsUpdate = true;
    poles.frustumCulled = false;
    bulbs.frustumCulled = false;
    scene.add(poles);
    scene.add(bulbs);
  }

  function makeSignTexture(text, sub, color, vertical) {
    const w = vertical ? 256 : 640;
    const h = vertical ? 512 : 256;
    return canvasTexture(makeCanvas(w, h, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#07130d');
      g.addColorStop(0.55, '#0c2117');
      g.addColorStop(1, '#030a06');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.strokeRect(5, 5, w - 10, h - 10);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1;
      ctx.strokeRect(14, 14, w - 28, h - 28);
      ctx.shadowColor = color;
      ctx.shadowBlur = 22;
      ctx.fillStyle = color;
      if (vertical) {
        ctx.font = '900 44px Orbitron, Arial Black, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const chars = text.replace(/\s+/g, '').slice(0, 9).split('');
        const step = (h - 70) / chars.length;
        chars.forEach((c, i) => ctx.fillText(c, w / 2, 50 + step * (i + 0.5)));
      } else {
        ctx.font = '900 62px Orbitron, Arial Black, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h * 0.42, w - 60);
        if (sub) {
          ctx.shadowBlur = 0;
          ctx.font = '600 23px Rajdhani, sans-serif';
          ctx.fillStyle = 'rgba(235,255,244,0.72)';
          ctx.fillText(sub, w / 2, h * 0.72, w - 60);
        }
      }
    }));
  }

  function createBillboard(text, sub, color, w, h, vertical) {
    const group = new THREE.Group();
    const tex = makeSignTexture(text, sub, color, vertical);
    const screenMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.9,
      side: THREE.FrontSide,
      depthWrite: false
    });
    const planeGeo = new THREE.PlaneGeometry(w, h);
    const screen = new THREE.Mesh(planeGeo, screenMat);
    screen.position.z = 0.14;
    group.add(screen);
    const screenBack = new THREE.Mesh(planeGeo, screenMat);
    screenBack.position.z = -0.14;
    screenBack.rotation.y = Math.PI;
    group.add(screenBack);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.5, h + 0.5, 0.24),
      new THREE.MeshLambertMaterial({ color: 0x111b16 })
    );
    group.add(frame);
    billboardMats.push(screenMat);
    return group;
  }

  function placeBillboard(stationIndex, text, sub, color, w, h, offset, along, y, vertical) {
    const group = createBillboard(text, sub, color, w, h, vertical);
    const pos = stationPoint(stationIndex, offset, along);
    group.position.set(pos.x, y, pos.z);
    const target = stationPositions[stationIndex];
    group.rotation.y = Math.atan2(target.x - pos.x, target.z - pos.z);
    scene.add(group);
    return group;
  }

  function placeTrackBillboard(stationIndex, text, sub, color, w, h, offset, ahead, y) {
    const group = createBillboard(text, sub, color, w, h, false);
    const pos = stationPoint(stationIndex, offset, ahead);
    group.position.set(pos.x, y, pos.z);
    const tan = stationTangents[stationIndex];
    group.rotation.y = Math.atan2(-tan.x, -tan.z);
    scene.add(group);
    return group;
  }

  function buildBillboards() {
    placeBillboard(23, 'SIAM', 'BANGKOK', '#2ed47a', 15, 6, 22, -10, 16, false);
    placeBillboard(23, 'SIAM', 'PARAGON', '#f2c94c', 12, 5, -22, 10, 13, false);
    placeBillboard(27, 'TERMINAL 21', 'ASOK · MRT', '#f2c94c', 16, 6, 32, 8, 20, false);
    placeBillboard(26, 'NANA', 'SOI 4', '#f178b6', 3.2, 10, 20, 4, 7, true);
    placeBillboard(29, 'THONG LO', 'SOI 55', '#2ed47a', 3.2, 9, 22, -8, 6.5, true);
    placeBillboard(30, 'EKAMAI', 'EASTERN BUS', '#2d9cdb', 12, 4.5, 28, 0, 8, false);
    placeBillboard(16, 'CHATUCHAK', 'MARKET · PARK', '#8bc34a', 12, 4.5, 36, 0, 8, false);
    placeBillboard(20, 'VICTORY', 'MONUMENT', '#f2c94c', 9, 4, 36, 0, 8, false);
    placeBillboard(21, 'PHaya THAI', 'AIRPORT RAIL LINK', '#e5484d', 11, 4.2, 30, 0, 10, false);
    placeBillboard(38, 'SAMRONG', 'YELLOW LINE', '#f2c94c', 9, 4, 38, 0, 9, false);

    // Track-facing screens visible from the driver's cab.
    placeTrackBillboard(23, 'BTS', 'SUKHUMVIT LINE', '#2ed47a', 12, 4.5, -23, 72, 12);
    placeTrackBillboard(24, 'CHIT LOM', 'CENTRAL EMBASSY', '#f2c94c', 10, 3.6, 22, 58, 10);
    placeTrackBillboard(27, 'TERMINAL 21', 'ASOK · MRT', '#f2c94c', 12, 4.4, -25, 76, 14);
    placeTrackBillboard(29, 'THONG LO', 'SOI 55 · NIGHT LIFE', '#f178b6', 10, 3.6, 24, 54, 10);
    placeTrackBillboard(30, 'EKAMAI', 'EASTERN BUS TERMINAL', '#2d9cdb', 11, 3.8, -24, 62, 10);
    placeTrackBillboard(38, 'SAMRONG', 'YELLOW LINE', '#f2c94c', 10, 3.6, 24, 58, 10);
    placeTrackBillboard(40, 'ERAWAN', 'MUSEUM', '#f2c94c', 12, 4.4, -26, 70, 13);
    placeTrackBillboard(0, 'KHU KHOT', 'DEPOT & PARK', '#8bc34a', 12, 4, 0, 55, 14);
    placeTrackBillboard(16, 'CHATUCHAK', 'MARKET · PARK', '#8bc34a', 12, 4, 0, 55, 14);
    placeTrackBillboard(20, 'VICTORY', 'MONUMENT', '#f2c94c', 10, 4, 0, 55, 14);
    placeTrackBillboard(27, 'TERMINAL 21', 'ASOK · MRT', '#f2c94c', 14, 5, 0, 55, 16);
    placeTrackBillboard(40, 'ERAWAN', 'MUSEUM', '#f2c94c', 14, 5, 0, 60, 18);
    placeTrackBillboard(46, 'KHEHA', 'TERMINUS', '#2d9cdb', 14, 5, 0, -45, 16);
  }

  function addPark(si, offset, along, w, d, name, sub) {
    const pos = stationPoint(si, offset, along);
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = Math.atan2(stationTangents[si].x, stationTangents[si].z);

    const lawn = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshLambertMaterial({ color: 0x4c7a43 })
    );
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.y = 0.035;
    group.add(lawn);

    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, d * 0.86),
      new THREE.MeshLambertMaterial({ color: 0xbdb49b })
    );
    path.rotation.x = -Math.PI / 2;
    path.position.y = 0.05;
    group.add(path);

    const pond = new THREE.Mesh(
      new THREE.CircleGeometry(Math.min(w, d) * 0.16, 24),
      new THREE.MeshLambertMaterial({ color: 0x2e6d79, transparent: true, opacity: 0.92 })
    );
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(w * 0.18, 0.06, d * 0.12);
    group.add(pond);

    const sign = createBillboard(name, sub, '#8bc34a', 8, 2.8, false);
    sign.position.set(0, 3.2, -d * 0.3);
    sign.rotation.y = 0;
    group.add(sign);

    // Park trees
    const treeList = [];
    for (let i = 0; i < Math.floor(w * d / 220); i++) {
      const x = rand(-w * 0.42, w * 0.42);
      const z = rand(-d * 0.42, d * 0.42);
      if (Math.abs(x) < 5 && Math.abs(z) < d * 0.42) continue;
      treeList.push({
        x: pos.x + Math.cos(group.rotation.y) * x + Math.sin(group.rotation.y) * z,
        z: pos.z - Math.sin(group.rotation.y) * x + Math.cos(group.rotation.y) * z,
        h: rand(3, 7), r: rand(1.4, 3.1),
        color: pick([0x3f6f3b, 0x4d7c42, 0x5c8a4d, 0x6a9354])
      });
    }
    buildTrees(treeList);
    scene.add(group);
    return group;
  }

  function buildParks() {
    addPark(16, 42, 0, 130, 92, 'CHATUCHAK', 'PARK & MARKET');
    addPark(28, 38, 0, 84, 62, 'BENCHASIRI', 'PARK · PHROM PHONG');

    // Chatuchak market stalls
    const group = new THREE.Group();
    const base = stationPoint(16, 26, -30);
    group.position.copy(base);
    group.rotation.y = Math.atan2(stationTangents[16].x, stationTangents[16].z);
    for (let i = 0; i < 16; i++) {
      const x = rand(-22, 22);
      const z = rand(-18, 18);
      const stall = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 1.1, 3.0),
        new THREE.MeshLambertMaterial({ color: pick([0x8d6f4e, 0xa98760, 0x6f8b6a]) })
      );
      stall.position.set(x, 0.55, z);
      group.add(stall);
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 0.12, 3.4),
        new THREE.MeshLambertMaterial({ color: pick([0xd94a3a, 0x2e8b57, 0x2d9cdb, 0xf2c94c]) })
      );
      awning.position.set(x, 2.1, z);
      group.add(awning);
      for (const sx of [-1.5, 1.5]) {
        for (const sz of [-1.4, 1.4]) {
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 2.0, 4),
            new THREE.MeshLambertMaterial({ color: 0x4b4f45 })
          );
          leg.position.set(x + sx, 1.05, z + sz);
          group.add(leg);
        }
      }
    }
    scene.add(group);
  }

  function buildTraffic() {
    const colors = [0xe8e8e2, 0x242a2c, 0xb8bcc0, 0x8c1d2c, 0x1e4f7a, 0xd7a52b, 0x2e7d5b, 0xefefef, 0x5b3a7a];
    const bodyGeo = new THREE.BoxGeometry(0.9, 0.5, 1.85);
    const roofGeo = new THREE.BoxGeometry(0.76, 0.34, 0.9);
    const lightGeo = new THREE.SphereGeometry(0.07, 5, 4);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0 });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff4055 });
    for (let i = 0; i < 46; i++) {
      const g = new THREE.Group();
      const color = pick(colors);
      const body = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color }));
      body.position.y = 0.3;
      g.add(body);
      const roof = new THREE.Mesh(roofGeo, new THREE.MeshLambertMaterial({ color: 0x1b2426, transparent: true, opacity: 0.82 }));
      roof.position.set(0, 0.7, -0.1);
      g.add(roof);
      for (const x of [-0.28, 0.28]) {
        const hl = new THREE.Mesh(lightGeo, lightMat);
        hl.position.set(x, 0.34, 0.92);
        g.add(hl);
        const tl = new THREE.Mesh(lightGeo, tailMat);
        tl.position.set(x, 0.34, -0.92);
        g.add(tl);
      }
      g.name = 'TrafficCar' + i;
      scene.add(g);
      traffic.push({
        group: g,
        dist: rand(0, displayTotal),
        speed: rand(9, 21),
        dir: Math.random() < 0.5 ? 1 : -1,
        lane: (Math.random() < 0.5 ? -1 : 1) * rand(2.6, 6.5)
      });
    }
  }

  /* ---------------------------------------------------------------------------
     The 47 BTS stations
     ------------------------------------------------------------------------ */

  function makeStationSign(st) {
    const canvas = makeCanvas(768, 128, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, '#04331d');
      g.addColorStop(0.55, '#062d1b');
      g.addColorStop(1, '#031a10');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#00a651';
      ctx.fillRect(0, 0, 8, h);
      ctx.fillStyle = '#00a651';
      ctx.fillRect(14, 18, 92, 92);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 31px Orbitron, Arial Black, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BTS', 60, 66);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f2c94c';
      ctx.font = '900 28px Orbitron, Arial Black, sans-serif';
      ctx.fillText(st.code, 126, 44);
      ctx.fillStyle = '#effff7';
      ctx.font = '700 36px Rajdhani, sans-serif';
      ctx.fillText(st.en, 126, 82, 520);
      ctx.fillStyle = '#9fd8b6';
      ctx.font = '500 23px "Noto Sans Thai", Rajdhani, sans-serif';
      ctx.fillText(st.th, 126, 110, 520);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#2ed47a';
      ctx.font = '700 20px Orbitron, sans-serif';
      ctx.fillText('ZONE ' + st.zone, 742, 42);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(600, 58, 142, 1);
      ctx.fillStyle = '#f2c94c';
      ctx.font = '700 18px Rajdhani, sans-serif';
      ctx.fillText('SUKHUMVIT LINE', 742, 88);
    });
    return canvasTexture(canvas);
  }

  function buildStations() {
    const platformGeo = new THREE.BoxGeometry(2.8, 0.32, 34);
    const platformMat = new THREE.MeshLambertMaterial({ color: 0x8f9184 });
    const tactileGeo = new THREE.BoxGeometry(0.28, 0.07, 34);
    const tactileMat = new THREE.MeshLambertMaterial({ color: 0xf2c94c, emissive: 0x4a3b00, emissiveIntensity: 0.35 });
    const canopyGeo = new THREE.BoxGeometry(5.4, 0.18, 34);
    const canopyMat = new THREE.MeshLambertMaterial({ color: 0x1c3a2a, emissive: 0x07150d, emissiveIntensity: 0.2 });
    const columnGeo = new THREE.CylinderGeometry(0.11, 0.14, 3.9, 6);
    const columnMat = new THREE.MeshLambertMaterial({ color: 0x8d9b90 });
    const benchGeo = new THREE.BoxGeometry(0.55, 0.09, 1.9);
    const benchMat = new THREE.MeshLambertMaterial({ color: 0x6f7d72 });
    const lampPoleGeo = new THREE.CylinderGeometry(0.06, 0.08, 3.4, 5);
    const lampMat = new THREE.MeshLambertMaterial({ color: 0x59635c });
    const lampGlowGeo = new THREE.SphereGeometry(0.11, 6, 4);
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe6a3 });
    const glassPanelMat = new THREE.MeshPhongMaterial({
      color: 0x7fb8c6, transparent: true, opacity: 0.38, shininess: 90, side: THREE.DoubleSide
    });
    const peds = [];

    STATIONS.forEach((st, si) => {
      const group = new THREE.Group();
      group.name = 'Station_' + st.code;
      group.position.copy(stationPositions[si]);
      group.quaternion.setFromUnitVectors(FORWARD_Z, stationTangents[si]);
      const signTex = makeStationSign(st);
      const signMat = new THREE.MeshBasicMaterial({ map: signTex, side: THREE.FrontSide });

      for (const side of [-1, 1]) {
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.set(side * 3.72, 0.05, 0);
        group.add(platform);

        const tactile = new THREE.Mesh(tactileGeo, tactileMat);
        tactile.position.set(side * 2.56, 0.25, 0);
        group.add(tactile);

        const canopy = new THREE.Mesh(canopyGeo, canopyMat);
        canopy.position.set(side * 3.72, 4.18, 0);
        group.add(canopy);

        const fascia = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.34, 34),
          new THREE.MeshLambertMaterial({ color: 0x00a651, emissive: 0x00381d, emissiveIntensity: 0.6 })
        );
        fascia.position.set(side * 5.28, 3.98, 0);
        group.add(fascia);

        if (st.interchange.length) {
          const ix = INTERCHANGES[st.interchange[0]];
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.2, 34),
            new THREE.MeshBasicMaterial({ color: ix.color })
          );
          stripe.position.set(side * 5.3, 3.72, 0);
          group.add(stripe);
        }

        // Station name boards facing the track and the street.
        const innerSign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2), signMat);
        innerSign.position.set(side * 2.5, 3.2, 0);
        innerSign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        group.add(innerSign);

        const outerSign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2), signMat);
        outerSign.position.set(side * 5.42, 3.2, 0);
        outerSign.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        group.add(outerSign);

        for (const z of [-13.5, 0, 13.5]) {
          const col = new THREE.Mesh(columnGeo, columnMat);
          col.position.set(side * 4.9, 2.08, z);
          group.add(col);
        }
        for (const z of [-12, 12]) {
          const pole = new THREE.Mesh(lampPoleGeo, lampMat);
          pole.position.set(side * 4.86, 1.7, z);
          group.add(pole);
          const glow = new THREE.Mesh(lampGlowGeo, lampGlowMat);
          glow.position.set(side * 4.86, 3.42, z);
          group.add(glow);
        }
        for (const z of [-6, 6]) {
          const bench = new THREE.Mesh(benchGeo, benchMat);
          bench.position.set(side * 4.3, 0.64, z);
          group.add(bench);
          for (const dz of [-0.65, 0.65]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.08), benchMat);
            leg.position.set(side * 4.3, 0.43, z + dz);
            group.add(leg);
          }
        }

        // Concourse / lift shaft below the platform.
        const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.8, 5.0, 5.2), glassPanelMat);
        shaft.position.set(side * 6.4, -2.35, 12.5);
        group.add(shaft);
        const shaftRoof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 5.6), canopyMat);
        shaftRoof.position.set(side * 6.4, 0.2, 12.5);
        group.add(shaftRoof);
        const liftCore = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.4, 1.2), columnMat);
        liftCore.position.set(side * 6.4, -2.4, 12.5);
        group.add(liftCore);

        // Platform pylon sign.
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.4, 0.32), columnMat);
        pylon.position.set(side * 5.8, 1.7, -16.3);
        group.add(pylon);
        const pylonSign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), signMat);
        pylonSign.position.set(side * 5.8, 3.0, -16.14);
        pylonSign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        group.add(pylonSign);

        // Waiting passengers.
        const pedCount = randInt(4, 8);
        for (let k = 0; k < pedCount; k++) {
          const lx = side * rand(3.2, 4.7);
          const lz = rand(-13, 13);
          peds.push({
            x: stationPositions[si].x + stationNormal(si).x * lx + stationTangents[si].x * lz,
            z: stationPositions[si].z + stationNormal(si).z * lx + stationTangents[si].z * lz,
            y: TRACK_Y + 0.56,
            color: pick([0xe8e2d2, 0x2d4f6e, 0xb84a4a, 0x4d7c62, 0xd9b15e, 0x7a6a9a, 0xe2e8e4, 0x3b3f44]),
            scale: rand(0.88, 1.08)
          });
        }
      }

      // Track-side signal head.
      const signalGroup = new THREE.Group();
      signalGroup.position.set(2.92, 0.55, -16.9);
      const signalPole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.5, 5), columnMat);
      signalPole.position.y = 0.75;
      signalGroup.add(signalPole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.82, 0.24), new THREE.MeshLambertMaterial({ color: 0x20251f }));
      head.position.y = 1.62;
      signalGroup.add(head);
      const lampGeo = new THREE.SphereGeometry(0.075, 6, 4);
      const redMat = new THREE.MeshBasicMaterial({ color: 0x3b0b12 });
      const amberMat = new THREE.MeshBasicMaterial({ color: 0x3b2c06 });
      const greenMat = new THREE.MeshBasicMaterial({ color: 0x2ed47a });
      const red = new THREE.Mesh(lampGeo, redMat);
      red.position.set(0, 1.88, 0.13);
      signalGroup.add(red);
      const amber = new THREE.Mesh(lampGeo, amberMat);
      amber.position.set(0, 1.62, 0.13);
      signalGroup.add(amber);
      const green = new THREE.Mesh(lampGeo, greenMat);
      green.position.set(0, 1.36, 0.13);
      signalGroup.add(green);
      group.add(signalGroup);
      stationSignals[si] = { redMat, amberMat, greenMat };

      // A slim station clock / camera pole at the far end.
      const cameraPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.6, 5), columnMat);
      cameraPole.position.set(-4.9, 1.3, 16.2);
      group.add(cameraPole);
      const cameraBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.45), new THREE.MeshLambertMaterial({ color: 0x2a302d }));
      cameraBox.position.set(-4.9, 2.55, 16.0);
      group.add(cameraBox);

      scene.add(group);
    });

    buildPedestrians(peds);
  }

  function buildPedestrians(peds) {
    if (!peds.length) return;
    const bodyGeo = new THREE.CylinderGeometry(0.13, 0.17, 0.7, 6);
    const headGeo = new THREE.SphereGeometry(0.12, 6, 4);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, peds.length);
    const heads = new THREE.InstancedMesh(headGeo, headMat, peds.length);
    const dummy = new THREE.Object3D();
    const skin = [0xd9a77c, 0xc68e64, 0xe5b98e, 0xa9714d, 0xf0c9a0];
    peds.forEach((ped, i) => {
      dummy.position.set(ped.x, ped.y, ped.z);
      dummy.quaternion.set(0, 0, 0, 1);
      dummy.scale.set(ped.scale, ped.scale, ped.scale);
      dummy.updateMatrix();
      bodies.setMatrixAt(i, dummy.matrix);
      bodies.setColorAt(i, new THREE.Color(ped.color));

      dummy.position.set(ped.x, ped.y + 0.47 * ped.scale, ped.z);
      dummy.scale.set(ped.scale, ped.scale, ped.scale);
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
      heads.setColorAt(i, new THREE.Color(pick(skin)));
    });
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
    bodies.frustumCulled = false;
    heads.frustumCulled = false;
    bodies.name = 'PassengerBodies';
    heads.name = 'PassengerHeads';
    scene.add(bodies);
    scene.add(heads);
    pedestrianBodyMesh = bodies;
    pedestrianHeadMesh = heads;
  }

  /* ---------------------------------------------------------------------------
     Landmarks: Victory Monument, Siam, Terminal 21, Erawan, the delta
     ------------------------------------------------------------------------ */

  function landmarkGroup(stationIndex, offset, along, name) {
    const group = new THREE.Group();
    group.name = name;
    group.position.copy(stationPoint(stationIndex, offset, along));
    group.quaternion.setFromUnitVectors(FORWARD_Z, stationTangents[stationIndex]);
    scene.add(group);
    return group;
  }

  function addBox(parent, w, h, d, x, y, z, color, opts) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {}))
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function addCylinder(parent, rt, rb, h, seg, x, y, z, color, opts) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(rt, rb, h, seg),
      new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {}))
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function addGlassBox(parent, w, h, d, x, y, z, color) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshPhongMaterial({
        color, transparent: true, opacity: 0.26, shininess: 110,
        specular: 0xc8ecff, side: THREE.DoubleSide
      })
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function addSignBoard(parent, text, sub, color, w, h, x, y, z, rotY) {
    const tex = makeSignTexture(text, sub, color, false);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.FrontSide });
    const geo = new THREE.PlaneGeometry(w, h);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    if (rotY != null) mesh.rotation.y = rotY;
    parent.add(mesh);
    const back = new THREE.Mesh(geo, mat);
    back.position.set(x, y, z);
    back.rotation.y = (rotY != null ? rotY : 0) + Math.PI;
    parent.add(back);
    return mesh;
  }

  function buildLandmarks() {
    createVictoryMonument();
    createSiamSkywalk();
    createTerminal21();
    createBenchasiri();
    createErawanMuseum();
    createChatuchakSign();
    createKhuKhotDepot();
    createKhehaTerminus();
    createWatPhraSriMahathat();
    createPhayaThaiARL();
    createSamrongYellow();
    createPakNamDelta();
    createKasetsart();
    createThongLoNeon();
    createAsokMRT();
  }

  function createVictoryMonument() {
    const g = landmarkGroup(20, 28, 35, 'VictoryMonument');
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(21, 30, 56),
      new THREE.MeshLambertMaterial({ color: 0x343a36, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.035;
    g.add(ring);
    addCylinder(g, 9.2, 10.2, 0.8, 32, 0, 0.4, 0, 0x9b9d91);
    addCylinder(g, 7.2, 8.2, 1.2, 32, 0, 1.4, 0, 0xb9b8a8);
    addCylinder(g, 1.2, 2.4, 26, 4, 0, 15.0, 0, 0xc9c7b6);
    addCylinder(g, 0.6, 1.2, 4, 4, 0, 29.5, 0, 0xf2c94c);
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xf2c94c, metalness: 0.7, roughness: 0.3, emissive: 0x5b4300, emissiveIntensity: 0.5 })
    );
    orb.position.set(0, 32.4, 0);
    g.add(orb);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const x = Math.cos(a) * 6.2;
      const z = Math.sin(a) * 6.2;
      addCylinder(g, 0.28, 0.35, 2.8, 6, x, 2.8, z, 0x5c5a4d);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshLambertMaterial({ color: 0x5c5a4d }));
      head.position.set(x, 4.35, z);
      g.add(head);
    }
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      addBox(g, 0.4, 0.1, 1.2, Math.cos(a) * 10, 0.09, Math.sin(a) * 10, 0xe8e0b0);
    }
  }

  function createSiamSkywalk() {
    const g = landmarkGroup(23, 0, 0, 'SiamSkywalk');
    for (const y of [12, 15.6]) {
      for (const z of [8, -8]) {
        addBox(g, 62, 0.36, 5.2, 0, y, z, 0x4f5d55);
        addBox(g, 62, 0.1, 5.24, 0, y + 0.23, z, 0x2ed47a, { emissive: 0x0a3a1e, emissiveIntensity: 0.6 });
        addGlassBox(g, 62, 0.85, 0.1, 0, y + 0.7, z + 2.55, 0x4f7a7a);
        addGlassBox(g, 62, 0.85, 0.1, 0, y + 0.7, z - 2.55, 0x4f7a7a);
        addBox(g, 62, 0.08, 0.12, 0, y + 1.15, z + 2.55, 0x2ed47a, { emissive: 0x0a3a1e, emissiveIntensity: 0.7 });
        addBox(g, 62, 0.08, 0.12, 0, y + 1.15, z - 2.55, 0x2ed47a, { emissive: 0x0a3a1e, emissiveIntensity: 0.7 });
      }
      for (const x of [-30, -10, 10, 30]) {
        addBox(g, 0.35, 1.8, 5.6, x, y, 8, 0x2ed47a, { emissive: 0x0a3a1e, emissiveIntensity: 0.5 });
        addBox(g, 0.35, 1.8, 5.6, x, y, -8, 0x2ed47a, { emissive: 0x0a3a1e, emissiveIntensity: 0.5 });
      }
    }
    for (const x of [-31, 31]) {
      addBox(g, 5, 13, 5, x, 6.5, 8, 0x8d9b90);
      addBox(g, 5, 13, 5, x, 6.5, -8, 0x8d9b90);
      addGlassBox(g, 2.2, 11, 2.2, x, 6.2, 0, 0x9bd8e4);
    }
    addSignBoard(g, 'SIAM', 'SKYWALK · BTS · MRT', '#2ed47a', 12, 3.8, 0, 18.5, -2, 0);
    addBox(g, 20, 0.3, 0.3, 0, 19.8, -2, 0x2ed47a, { emissive: 0x0a3a1e, emissiveIntensity: 1.0 });
    for (let i = 0; i < 12; i++) {
      const x = -27 + i * 5;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe6a3 }));
      lamp.position.set(x, 11.1, 5.2);
      g.add(lamp);
      const lamp2 = lamp.clone();
      lamp2.position.z = -5.2;
      g.add(lamp2);
    }
  }

  function createTerminal21() {
    const g = landmarkGroup(27, 34, 36, 'Terminal21');
    addBox(g, 20, 42, 17, 0, 21, 0, 0xcfd8d2);
    const bands = [0xe5484d, 0xf2c94c, 0x2d9cdb, 0x2ed47a, 0xf178b6];
    bands.forEach((c, i) => {
      addBox(g, 20.5, 1.4, 17.5, 0, 5 + i * 7.2, 0, c, { emissive: c, emissiveIntensity: 0.12 });
    });
    addGlassBox(g, 15, 8, 0.4, 0, 37, -8.7, 0x9bd8e4);
    addSignBoard(g, 'TERMINAL 21', 'ASOK · BANGKOK', '#f2c94c', 15, 4.4, -10.15, 35, 0, -Math.PI / 2);
    // Rooftop aircraft
    const plane = new THREE.Group();
    plane.position.set(0, 44, 0);
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 11, 10), new THREE.MeshLambertMaterial({ color: 0xe9eef0 }));
    fuselage.rotation.z = Math.PI / 2;
    plane.add(fuselage);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 12), new THREE.MeshLambertMaterial({ color: 0xd7dfe2 }));
    wing.position.y = 0.2;
    plane.add(wing);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.4, 3), new THREE.MeshLambertMaterial({ color: 0xe9eef0 }));
    tail.position.set(-5, 1.8, 0);
    plane.add(tail);
    g.add(plane);
    // MRT entrance
    addBox(g, 4.5, 3.2, 6.2, 14, 1.6, -10, 0x2d9cdb, { emissive: 0x0a2c42, emissiveIntensity: 0.4 });
    addSignBoard(g, 'MRT', 'BLUE LINE', '#2d9cdb', 3.6, 1.4, 14, 3.7, -10, Math.PI / 2);
    addGlassBox(g, 18, 1.2, 3.2, 6, 9.5, -10, 0x9bd8e4);
  }

  function createBenchasiri() {
    const g = landmarkGroup(28, 36, 0, 'BenchasiriPark');
    addSignBoard(g, 'BENCHASIRI', 'PARK · PHROM PHONG', '#8bc34a', 8, 2.8, 0, 3.2, -22, 0);
    addBox(g, 3, 0.2, 0.2, 0, 2.6, -22, 0x8bc34a, { emissive: 0x1a3a0a, emissiveIntensity: 0.7 });
  }

  function createErawanMuseum() {
    const g = landmarkGroup(40, 24, 70, 'ErawanMuseum');
    addCylinder(g, 13, 15, 5, 24, 0, 2.5, 0, 0x8c6b3e);
    addCylinder(g, 11.5, 12.5, 0.8, 24, 0, 5.3, 0, 0xc9a24a);
    const gold = new THREE.MeshStandardMaterial({ color: 0xb98a3e, metalness: 0.55, roughness: 0.42, emissive: 0x3a2600, emissiveIntensity: 0.28 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), gold);
    body.scale.set(8.5, 5.4, 11);
    body.position.set(0, 11.4, 0);
    g.add(body);
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 4.8;
      const head = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12), gold);
      head.position.set(-6.4, 14.6, z);
      head.scale.set(1.05, 0.95, 1);
      g.add(head);
      const trunkPts = [
        new THREE.Vector3(-8.8, 13.8, z),
        new THREE.Vector3(-11.8, 11.2, z),
        new THREE.Vector3(-11.4, 7.0, z),
        new THREE.Vector3(-8.9, 5.2, z)
      ];
      const trunk = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trunkPts), 16, 0.7, 6, false),
        gold
      );
      g.add(trunk);
      for (const sz of [-1, 1]) {
        const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.38, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0xf2ead2, roughness: 0.5 }));
        tusk.position.set(-9.0, 12.6, z + sz * 1.2);
        tusk.rotation.z = Math.PI / 2.4;
        g.add(tusk);
      }
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 2.6), gold);
      ear.position.set(-6.4, 14.8, z + (i - 1) * 2.2);
      g.add(ear);
    }
    for (const x of [-4.2, 4.2]) {
      for (const z of [-5.2, 5.2]) {
        addCylinder(g, 1.35, 1.6, 8.5, 8, x, 6.2, z, 0x9b7438);
      }
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      addCylinder(g, 0.18, 0.25, 5, 5, Math.cos(a) * 18, 2.5, Math.sin(a) * 18, 0x4d7c42);
    }
  }

  function createChatuchakSign() {
    const g = landmarkGroup(16, 44, 0, 'ChatuchakMarket');
    addSignBoard(g, 'CHATUCHAK', 'WEEKEND MARKET', '#8bc34a', 12, 3.6, 0, 5.4, -40, 0);
    addBox(g, 12, 0.3, 0.3, 0, 4.9, -40, 0x8bc34a, { emissive: 0x1a3a0a, emissiveIntensity: 0.8 });
    addCylinder(g, 0.2, 0.25, 5, 5, -5, 2.5, -40, 0x555d57);
    addCylinder(g, 0.2, 0.25, 5, 5, 5, 2.5, -40, 0x555d57);
  }

  function createKhuKhotDepot() {
    const g = landmarkGroup(0, 45, 38, 'KhuKhotDepot');
    addBox(g, 56, 11, 26, 0, 5.5, 0, 0x6e7c72);
    addBox(g, 58, 0.8, 28, 0, 11.4, 0, 0x4d5a51);
    addSignBoard(g, 'KHU KHOT', 'DEPOT & PARK', '#8bc34a', 14, 4, 0, 8.5, -13.1, Math.PI);
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 6.4;
      addBox(g, 20, 2.1, 2.6, 0, 1.4, z, 0xe9eee9);
      addBox(g, 20.1, 0.3, 2.7, 0, 1.0, z, 0x00a651);
      addBox(g, 20.2, 0.2, 2.8, 0, 2.5, z, 0xcfd8d2);
      for (const x of [-7, 7]) {
        addCylinder(g, 0.45, 0.45, 0.3, 8, x, 0.35, z + 1.4, 0x242a27);
        addCylinder(g, 0.45, 0.45, 0.3, 8, x, 0.35, z - 1.4, 0x242a27);
      }
    }
  }

  function createKhehaTerminus() {
    const g = landmarkGroup(46, 30, -30, 'KhehaTerminus');
    addBox(g, 20, 10, 16, 0, 5, 0, 0x9fb2ad);
    addGlassBox(g, 14, 5, 0.4, 0, 5, -8.2, 0x9bd8e4);
    addSignBoard(g, 'KHEHA', 'TERMINUS · SAMUT PRAKAN', '#2d9cdb', 14, 4.2, 0, 11.5, 8.4, 0);
    for (let i = 0; i < 4; i++) {
      addBox(g, 6, 2.6, 12, -16 + i * 10, 1.3, -16, 0x6f7d72);
      addBox(g, 6.2, 0.18, 12.2, -16 + i * 10, 2.7, -16, 0x2d9cdb);
    }
  }

  function createWatPhraSriMahathat() {
    const g = landmarkGroup(7, 30, 30, 'WatPhraSriMahathat');
    addBox(g, 18, 2.4, 16, 0, 1.2, 0, 0xe6dfcb);
    addBox(g, 14, 0.4, 12, 0, 2.5, 0, 0xc9a24a);
    addCylinder(g, 3.2, 4.0, 10, 8, 0, 7.6, 0, 0xf2c94c);
    addCylinder(g, 0.3, 3.2, 12, 8, 0, 18.6, 0, 0xf2c94c);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffe08a, metalness: 0.8, roughness: 0.2, emissive: 0x5b4300, emissiveIntensity: 0.7 }));
    orb.position.set(0, 25.1, 0);
    g.add(orb);
    for (const x of [-7, 7]) {
      addCylinder(g, 0.5, 0.6, 4.5, 6, x, 2.2, -5, 0xe6dfcb);
    }
    addSignBoard(g, 'WAT PHRA', 'SRI MAHATHAT', '#f2c94c', 10, 3.2, 0, 6.2, -8.2, 0);
  }

  function createPhayaThaiARL() {
    const g = landmarkGroup(21, 38, 0, 'PhayaThaiARL');
    addBox(g, 16, 8, 12, 0, 10, 0, 0xb33b40);
    addGlassBox(g, 12, 4, 0.4, 0, 10, -6.2, 0x9bd8e4);
    addSignBoard(g, 'ARL', 'AIRPORT RAIL LINK', '#e5484d', 10, 3.2, 0, 15.2, -6.4, 0);
    for (const x of [-6, 6]) addBox(g, 1.2, 10, 1.2, x, 5, 4, 0x8d9b90);
    addGlassBox(g, 30, 1.2, 3.4, 0, 8.2, -12, 0x9bd8e4);
    addBox(g, 0.4, 1.4, 34, 0, 8.8, -12, 0xe5484d, { emissive: 0x3b0b12, emissiveIntensity: 0.4 });
  }

  function createSamrongYellow() {
    const g = landmarkGroup(38, 44, 0, 'SamrongYellow');
    addBox(g, 20, 7, 10, 0, 10, 0, 0xd9d0b5);
    addBox(g, 20.4, 0.5, 10.4, 0, 13.7, 0, 0xf2c94c, { emissive: 0x4a3b00, emissiveIntensity: 0.4 });
    addSignBoard(g, 'SAMRONG', 'YELLOW LINE', '#f2c94c', 12, 3.4, 0, 15.4, -5.2, 0);
    for (const x of [-7, 7]) addBox(g, 1.1, 10, 1.1, x, 5, 0, 0x8d9b90);
    addGlassBox(g, 34, 1.2, 3.2, 0, 8.0, 0, 0x9bd8e4);
  }

  function createPakNamDelta() {
    const g = landmarkGroup(42, 50, 20, 'PakNamDelta');
    for (let i = 0; i < 6; i++) {
      addBox(g, 22, 8, 14, -20 + (i % 3) * 26, 4, -18 + Math.floor(i / 3) * 22, pick([0x8f9b98, 0xa9b2ad, 0x7f8c8b]));
      addBox(g, 22.4, 0.5, 14.4, -20 + (i % 3) * 26, 8.3, -18 + Math.floor(i / 3) * 22, 0x5c6764);
    }
    for (let i = 0; i < 4; i++) {
      addCylinder(g, 3, 3.4, 9, 12, 30, 4.5, -16 + i * 9, 0xc9c0a4);
    }
    addSignBoard(g, 'PAK NAM', 'SAMUT PRAKAN', '#2d9cdb', 12, 4, 0, 10, -30, 0);
    // Cargo ship silhouette on the horizon.
    const ship = new THREE.Group();
    ship.position.set(36, 0.2, 28);
    addBox(ship, 42, 2.4, 9, 0, 1.2, 0, 0x263b46);
    addBox(ship, 12, 6, 7, -8, 5.4, 0, 0xd7ddd8);
    for (let i = 0; i < 6; i++) {
      addBox(ship, 4.2, 2.2, 5.8, -2 + (i % 3) * 5, 3.2, -4 + Math.floor(i / 3) * 8, pick([0xe5484d, 0x2d9cdb, 0xf2c94c, 0x2ed47a]));
    }
    g.add(ship);
  }

  function createKasetsart() {
    const g = landmarkGroup(11, 48, 0, 'KasetsartUniversity');
    addBox(g, 30, 5, 18, 0, 2.5, 0, 0xd7d0bc);
    addBox(g, 26, 1.0, 14, 0, 5.2, 0, 0x8bc34a, { emissive: 0x1a3a0a, emissiveIntensity: 0.2 });
    addSignBoard(g, 'KASETSART', 'UNIVERSITY', '#8bc34a', 12, 3.6, 0, 7.2, -9.2, 0);
    for (const x of [-11, 11]) {
      addBox(g, 2.4, 8, 2.4, x, 4, -10, 0xbfc6b7);
    }
    addBox(g, 24, 1.2, 1.2, 0, 8.2, -10, 0x8bc34a);
  }

  function createThongLoNeon() {
    const g = landmarkGroup(29, 30, 0, 'ThongLoNeon');
    const signs = [
      ['THONG LO', '#2ed47a', 3.2, 9, -12],
      ['SOI 55', '#f2c94c', 2.6, 7, 0],
      ['BANGKOK', '#f178b6', 3.0, 8, 12]
    ];
    signs.forEach(([text, color, w, h, z]) => {
      const b = createBillboard(text, 'NIGHT LIFE', color, w, h, true);
      b.position.set(-12, 5.5, z);
      b.rotation.y = Math.PI / 2;
      g.add(b);
    });
    for (let i = 0; i < 8; i++) {
      addBox(g, 4, rand(3, 8), 6, -20 + i * 5, 2, 18, pick([0xd9c2a9, 0xbfc6b7, 0xe6dcc7]));
    }
  }

  function createAsokMRT() {
    const g = landmarkGroup(27, 26, -26, 'AsokMRT');
    addBox(g, 5, 3.4, 7, 0, 1.7, 0, 0x2d9cdb, { emissive: 0x0a2c42, emissiveIntensity: 0.4 });
    addGlassBox(g, 5.2, 1.0, 7.2, 0, 3.6, 0, 0x9bd8e4);
    addSignBoard(g, 'MRT', 'SUKHUMVIT', '#2d9cdb', 4.2, 1.6, 0, 2.6, -3.6, 0);
    addGlassBox(g, 28, 1.2, 3.0, 0, 7.6, 8, 0x9bd8e4);
  }

  /* ---------------------------------------------------------------------------
     Four-car BTS train
     ------------------------------------------------------------------------ */

  let frontSignMat = null;
  let headlightSprites = [];

  function makeDestTexture(text, sub) {
    return canvasTexture(makeCanvas(512, 96, (ctx, w, h) => {
      ctx.fillStyle = '#050c08';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,157,46,0.65)';
      ctx.lineWidth = 3;
      ctx.strokeRect(3, 3, w - 6, h - 6);
      ctx.fillStyle = '#ff9d2e';
      ctx.font = '900 40px Orbitron, Arial Black, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, 42, w - 40);
      ctx.fillStyle = '#ffb347';
      ctx.font = '700 17px Rajdhani, sans-serif';
      ctx.fillText(sub, w / 2, 72, w - 40);
    }));
  }

  function makeBtsLogoTexture() {
    return canvasTexture(makeCanvas(256, 128, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#1c4f9c';
      ctx.font = '900 64px Orbitron, Arial Black, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BTS', w / 2, 46);
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#c8102e';
      ctx.beginPath();
      ctx.arc(w / 2 - 22, 94, 20, Math.PI * 0.15, Math.PI * 0.95);
      ctx.stroke();
      ctx.strokeStyle = '#1c4f9c';
      ctx.beginPath();
      ctx.arc(w / 2 + 22, 94, 20, Math.PI * 0.05, Math.PI * 0.85);
      ctx.stroke();
    }));
  }

  function makeFrontMaskTexture() {
    return canvasTexture(makeCanvas(512, 320, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#c8102e';
      roundRectPath(ctx, 4, 4, w - 8, h - 8, 38);
      ctx.fill();
      ctx.fillStyle = '#080b0e';
      roundRectPath(ctx, 16, 16, w - 32, h - 32, 30);
      ctx.fill();
      // Transparent windshield aperture.
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      roundRectPath(ctx, 92, 58, w - 184, 150, 22);
      ctx.fill();
      ctx.restore();
      // Gold royal emblem.
      const gx = w / 2;
      const gy = 116;
      const gold = ctx.createRadialGradient(gx, gy, 2, gx, gy, 34);
      gold.addColorStop(0, '#fff3bd');
      gold.addColorStop(0.45, '#e8c76a');
      gold.addColorStop(1, '#8a6720');
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.arc(gx, gy, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5d4515';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(gx, gy, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#5d4515';
      ctx.beginPath();
      ctx.moveTo(gx, gy - 46);
      ctx.lineTo(gx - 10, gy - 24);
      ctx.lineTo(gx + 10, gy - 24);
      ctx.closePath();
      ctx.fill();
      // BTS logo under the mask.
      ctx.fillStyle = '#1c4f9c';
      ctx.font = '900 38px Orbitron, Arial Black, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BTS', w / 2, 258);
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#c8102e';
      ctx.beginPath();
      ctx.arc(w / 2 - 18, 286, 14, Math.PI * 0.15, Math.PI * 0.95);
      ctx.stroke();
      ctx.strokeStyle = '#1c4f9c';
      ctx.beginPath();
      ctx.arc(w / 2 + 18, 286, 14, Math.PI * 0.05, Math.PI * 0.85);
      ctx.stroke();
    }));
  }

  function buildTrain() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf3f5f1, roughness: 0.5, metalness: 0.12 });
    const lowerMat = new THREE.MeshStandardMaterial({ color: 0x1c4f9c, roughness: 0.38, metalness: 0.28 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1c4f9c, roughness: 0.38, metalness: 0.28 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.4, metalness: 0.2 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x080b0e, roughness: 0.34, metalness: 0.22, side: THREE.FrontSide });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: 0.32, metalness: 0.55, emissive: 0x3d2c00, emissiveIntensity: 0.35 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1b2426, roughness: 0.7, metalness: 0.2 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xd6dbd7, roughness: 0.62, metalness: 0.1 });
    const glassMat = new THREE.MeshPhongMaterial({
      color: 0x0a1118, transparent: true, opacity: 0.56, shininess: 140,
      specular: 0x9ed8ff, side: THREE.FrontSide
    });
    const interiorMat = new THREE.MeshLambertMaterial({ color: 0x23352d });
    const seatMat = new THREE.MeshLambertMaterial({ color: 0x1f5f4a });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xd9fff0 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x1c4f9c, roughness: 0.4, metalness: 0.24 });
    const doorGlassMat = new THREE.MeshPhongMaterial({
      color: 0x0a1118, transparent: true, opacity: 0.82, shininess: 130, side: THREE.DoubleSide
    });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfff4cf, emissive: 0xffe6a0, emissiveIntensity: 1.2, roughness: 0.3 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xff3048, emissive: 0xff2038, emissiveIntensity: 1.0, roughness: 0.3 });
    const wheelGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.16, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222826, roughness: 0.8, metalness: 0.3 });
    const poleGeo = new THREE.CylinderGeometry(0.028, 0.028, 1.8, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xb9c2bd, roughness: 0.25, metalness: 0.8 });
    const destSouth = makeDestTexture('E23 KHEHA', 'SUKHUMVIT LINE · SOUTHBOUND');
    const destNorth = makeDestTexture('N24 KHU KHOT', 'SUKHUMVIT LINE · NORTHBOUND');
    frontSignMat = new THREE.MeshBasicMaterial({ map: destSouth });

    const headGlowCanvas = makeCanvas(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,235,1)');
      g.addColorStop(0.2, 'rgba(255,245,190,0.8)');
      g.addColorStop(0.55, 'rgba(255,220,120,0.18)');
      g.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    const headGlowTex = canvasTexture(headGlowCanvas);

    const logoTex = makeBtsLogoTexture();
    const logoMat = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, side: THREE.FrontSide });
    const frontMaskMat = new THREE.MeshBasicMaterial({
      map: makeFrontMaskTexture(), transparent: true, side: THREE.FrontSide, depthWrite: false
    });

    for (let c = 0; c < 4; c++) {
      const car = new THREE.Group();
      car.name = 'BTS_Car_' + (c + 1);

      const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 5.2), bodyMat);
      body.position.y = 1.25;
      car.add(body);

      const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.42, 5.14), lowerMat);
      skirt.position.y = 0.32;
      car.add(skirt);

      // BTS blue lower body and black window band.
      const blueBand = new THREE.Mesh(new THREE.BoxGeometry(2.62, 1.0, 5.21), blueMat);
      blueBand.position.y = 0.72;
      car.add(blueBand);

      const waistLine = new THREE.Mesh(new THREE.BoxGeometry(2.63, 0.04, 5.22), bodyMat);
      waistLine.position.y = 1.23;
      car.add(waistLine);

      const windowBand = new THREE.Mesh(new THREE.BoxGeometry(2.63, 0.84, 5.18), blackMat);
      windowBand.position.y = 1.66;
      car.add(windowBand);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.18, 5.02), roofMat);
      roof.position.y = 2.42;
      car.add(roof);

      for (const z of [-1.25, 1.25]) {
        const ac = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.3, 1.35), roofMat);
        ac.position.set(0, 2.55, z);
        car.add(ac);
      }

      const under = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.5, 4.76), darkMat);
      under.position.y = 0.08;
      car.add(under);

      // Side glazing and the BTS logo on the white upper body.
      for (const side of [-1, 1]) {
        for (const z of [-1.75, 0, 1.75]) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.64, 1.26), glassMat);
          win.position.set(side * 1.318, 1.66, z);
          car.add(win);
        }
        const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.22), logoMat);
        logo.position.set(side * 1.323, 2.21, 1.72);
        logo.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        car.add(logo);
      }

      // Soft contact shadow on the viaduct deck.
      const blob = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 5.5),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 })
      );
      blob.rotation.x = -Math.PI / 2;
      blob.position.y = 0.015;
      car.add(blob);

      // Doors: two per side, two sliding leaves each.
      const doorwayMat = new THREE.MeshBasicMaterial({ color: 0x07120d });
      for (const side of [-1, 1]) {
        for (const z0 of [-1.15, 1.15]) {
          const doorway = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.72, 0.86), doorwayMat);
          doorway.position.set(side * 1.318, 1.34, z0);
          car.add(doorway);
          const doorwayLight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.76), lightMat);
          doorwayLight.position.set(side * 1.32, 2.16, z0);
          car.add(doorwayLight);
          for (const dir of [-1, 1]) {
            const panel = new THREE.Group();
            const baseZ = z0 + dir * 0.225;
            panel.position.set(side * 1.342, 1.34, baseZ);
            const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.72, 0.43), doorMat);
            panel.add(leaf);
            const dglass = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.52, 0.3), doorGlassMat);
            dglass.position.set(side * 0.045, 0.26, 0);
            panel.add(dglass);
            car.add(panel);
            doorPanels.push({
              group: panel,
              baseZ,
              openZ: z0 + dir * 0.66,
              side,
              car: c
            });
          }
        }
      }

      // Interior.
      const floor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.07, 4.9), interiorMat);
      floor.position.y = 0.48;
      car.add(floor);
      for (const side of [-1, 1]) {
        for (const z of [-1.55, -0.5, 0.55, 1.55]) {
          const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.9), seatMat);
          seat.position.set(side * 0.92, 0.72, z);
          car.add(seat);
        }
        for (const z of [-1.8, 0, 1.8]) {
          const pole = new THREE.Mesh(poleGeo, poleMat);
          pole.position.set(side * 0.9, 1.4, z);
          car.add(pole);
        }
      }
      for (const z of [-1.4, 1.4]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.035, 2.2), lightMat);
        strip.position.set(0, 2.31, z);
        car.add(strip);
      }

      // Bogies and wheels.
      for (const bz of [-1.72, 1.72]) {
        const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 1.05), darkMat);
        bogie.position.set(0, 0.26, bz);
        car.add(bogie);
        for (const wx of [-0.94, 0.94]) {
          const wheel = new THREE.Mesh(wheelGeo, wheelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wx, 0.18, bz);
          car.add(wheel);
        }
      }

      // Current-collector shoes on the third-rail side.
      for (const z of [-1.55, 1.55]) {
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.55), goldMat);
        shoe.position.set(1.14, 0.03, z);
        car.add(shoe);
      }

      // Couplers.
      for (const z of [-2.68, 2.68]) {
        const coupler = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.42), darkMat);
        coupler.position.set(0, 0.62, z);
        car.add(coupler);
      }

      // Lead cab details: black mask, red frame, gold emblem and BTS livery.
      if (c === 0) {
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.08, 0.82), new THREE.MeshPhongMaterial({
          color: 0x071018, transparent: true, opacity: 0.86, shininess: 140, side: THREE.FrontSide
        }));
        windshield.position.set(0, 1.78, 2.605);
        car.add(windshield);

        const frontMask = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.6), frontMaskMat);
        frontMask.position.set(0, 1.45, 2.62);
        car.add(frontMask);

        const topBar = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.07, 0.08), redMat);
        topBar.position.set(0, 2.27, 2.645);
        car.add(topBar);
        const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.08, 0.08), redMat);
        bottomBar.position.set(0, 0.66, 2.645);
        car.add(bottomBar);
        const sideBarL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.62, 0.08), redMat);
        sideBarL.position.set(-1.17, 1.45, 2.645);
        car.add(sideBarL);
        const sideBarR = sideBarL.clone();
        sideBarR.position.x = 1.17;
        car.add(sideBarR);

        const dest = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.3), frontSignMat);
        dest.position.set(0, 2.2, 2.65);
        car.add(dest);

        const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.24, 0.16), blueMat);
        bumper.position.set(0, 0.42, 2.63);
        car.add(bumper);
        const redStripe = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.07, 0.02), redMat);
        redStripe.position.set(0, 0.57, 2.65);
        car.add(redStripe);

        // Sloped front roof fairing gives the cab a rounded, determined profile.
        const noseRoof = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.16, 0.95), bodyMat);
        noseRoof.position.set(0, 2.38, 2.3);
        noseRoof.rotation.x = -0.14;
        car.add(noseRoof);

        for (const x of [-0.82, 0.82]) {
          const surround = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.23, 0.02), redMat);
          surround.position.set(x, 0.92, 2.642);
          car.add(surround);
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.06), headMat);
          head.position.set(x, 0.92, 2.66);
          car.add(head);
          const glow = new THREE.Sprite(new THREE.SpriteMaterial({
            map: headGlowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9
          }));
          glow.scale.set(1.35, 1.35, 1);
          glow.position.set(x, 0.92, 2.8);
          car.add(glow);
          headlightSprites.push(glow);
        }
        headlightMats.push(headMat);

        // Dashboard lip inside the cab.
        const dash = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.55), blackMat);
        dash.position.set(0, 1.14, 2.18);
        car.add(dash);
      }

      // Tail lights on the last car.
      if (c === 3) {
        for (const x of [-0.82, 0.82]) {
          const tail = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.13, 0.05), tailMat);
          tail.position.set(x, 0.92, -2.63);
          car.add(tail);
        }
        headlightMats.push(tailMat);
      }

      // Green underglow / third-rail power aesthetic.
      const glowStrip = new THREE.Mesh(
        new THREE.BoxGeometry(2.18, 0.035, 4.6),
        new THREE.MeshBasicMaterial({ color: 0x3f7fd4, transparent: true, opacity: 0.16 })
      );
      glowStrip.position.y = 0.01;
      car.add(glowStrip);

      car.userData.destSouth = destSouth;
      car.userData.destNorth = destNorth;
      scene.add(car);
      cars.push(car);
    }
    initRain();
    initDynamicPassengers();
  }

  function updateTrainTransform() {
    if (!cars.length) return;
    const base = state.distance * WORLD_PER_M;
    const p = new THREE.Vector3();
    const tan = new THREE.Vector3();
    for (let c = 0; c < cars.length; c++) {
      let s = base - state.direction * c * CAR_PITCH;
      s = clamp(s, 0.01, routeLengthWorld - 0.01);
      const u = s / routeLengthWorld;
      routeCurve.getPointAt(u, p);
      routeCurve.getTangentAt(u, tan);
      tan.y = 0;
      tan.normalize();
      tan.multiplyScalar(state.direction);
      cars[c].position.set(p.x, TRACK_Y + 0.02, p.z);
      cars[c].quaternion.setFromUnitVectors(FORWARD_Z, tan);
    }
    if (frontSignMat) {
      frontSignMat.map = state.direction > 0 ? cars[0].userData.destSouth : cars[0].userData.destNorth;
      frontSignMat.needsUpdate = true;
    }
  }

  function updateDoors(dt) {
    const target = state.doorsOpen ? 1 : 0;
    const step = 2.3 * dt;
    if (state.doorAnim < target) state.doorAnim = Math.min(target, state.doorAnim + step);
    else if (state.doorAnim > target) state.doorAnim = Math.max(target, state.doorAnim - step);
    const e = state.doorAnim * state.doorAnim * (3 - 2 * state.doorAnim);
    for (const panel of doorPanels) {
      panel.group.position.z = lerp(panel.baseZ, panel.openZ, e);
    }
  }

  /* ---------------------------------------------------------------------------
     Passenger exchange at platforms
     ------------------------------------------------------------------------ */

  function initDynamicPassengers() {
    if (dynamicPeds.length) return;
    const bodyGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.68, 6);
    const headGeo = new THREE.SphereGeometry(0.12, 6, 4);
    const legGeo = new THREE.CylinderGeometry(0.055, 0.07, 0.42, 5);
    const armGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.38, 5);
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xd9a77c });
    const colors = [0xe8e2d2, 0x2d4f6e, 0xb84a4a, 0x4d7c62, 0xd9b15e, 0x7a6a9a, 0xe2e8e4, 0x3b3f44];
    for (let i = 0; i < 28; i++) {
      const group = new THREE.Group();
      const color = colors[i % colors.length];
      const body = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color }));
      body.position.y = 0.7;
      group.add(body);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.1;
      group.add(head);
      const legL = new THREE.Mesh(legGeo, new THREE.MeshLambertMaterial({ color: 0x2c3430 }));
      legL.position.set(-0.075, 0.21, 0);
      group.add(legL);
      const legR = legL.clone();
      legR.position.x = 0.075;
      group.add(legR);
      const armL = new THREE.Mesh(armGeo, skinMat);
      armL.position.set(-0.2, 0.75, 0);
      armL.rotation.z = 0.08;
      group.add(armL);
      const armR = armL.clone();
      armR.position.x = 0.2;
      armR.rotation.z = -0.08;
      group.add(armR);
      if (i % 4 === 0) {
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.1), new THREE.MeshLambertMaterial({ color: 0x8c5a35 }));
        bag.position.set(0.22, 0.62, -0.08);
        group.add(bag);
      }
      group.visible = false;
      group.frustumCulled = false;
      scene.add(group);
      dynamicPeds.push({
        group, legL, legR, armL, armR,
        active: false, t: 0, duration: 1.8,
        start: new THREE.Vector3(), end: new THREE.Vector3(), phase: rand(0, Math.PI * 2)
      });
    }
  }

  function spawnPedestrian(start, end, duration) {
    const ped = dynamicPeds.find((p) => !p.active);
    if (!ped) return;
    ped.active = true;
    ped.t = 0;
    ped.duration = duration;
    ped.start.copy(start);
    ped.end.copy(end);
    ped.phase = rand(0, Math.PI * 2);
    ped.group.position.copy(start);
    ped.group.visible = true;
    const dir = end.clone().sub(start);
    ped.group.rotation.y = Math.atan2(dir.x, dir.z);
  }

  function spawnPassengerExchange() {
    if (!cars.length || !dynamicPeds.length) return;
    const doorX = 1.55;
    const platformX = 4.7;
    for (let c = 0; c < cars.length; c++) {
      const car = cars[c];
      for (const z0 of [-1.15, 1.15]) {
        const door = car.localToWorld(new THREE.Vector3(doorX, 0, z0));
        door.y = TRACK_Y + 0.24;
        const platform = car.localToWorld(new THREE.Vector3(platformX, 0, z0 + rand(-1.4, 1.4)));
        platform.y = TRACK_Y + 0.24;
        // Alighting passenger walks from the door to the platform.
        spawnPedestrian(door, platform, rand(1.5, 2.2));
        // Boarding passenger walks from the platform into the train.
        const platform2 = car.localToWorld(new THREE.Vector3(platformX + rand(0.2, 1.2), 0, z0 + rand(-1.2, 1.2)));
        platform2.y = TRACK_Y + 0.24;
        spawnPedestrian(platform2, door, rand(1.6, 2.4));
      }
    }
  }

  function updateDynamicPassengers(dt) {
    for (const ped of dynamicPeds) {
      if (!ped.active) continue;
      ped.t += dt / ped.duration;
      const e = clamp(ped.t, 0, 1);
      ped.group.position.lerpVectors(ped.start, ped.end, e);
      ped.group.position.y += Math.sin(e * Math.PI) * 0.025;
      const swing = Math.sin(e * Math.PI * 9 + ped.phase) * 0.55;
      ped.legL.rotation.x = swing;
      ped.legR.rotation.x = -swing;
      ped.armL.rotation.x = -swing * 0.7;
      ped.armR.rotation.x = swing * 0.7;
      if (ped.t >= 1) {
        ped.active = false;
        ped.group.visible = false;
      }
    }
  }

  /* ---------------------------------------------------------------------------
     Rain / storm scene
     ------------------------------------------------------------------------ */

  function initRain() {
    if (rainRoot) return;
    const positions = new Float32Array(RAIN_COUNT * 6);
    rainData = [];
    for (let i = 0; i < RAIN_COUNT; i++) {
      const x = rand(-105, 105);
      const y = rand(-12, 78);
      const z = rand(-105, 105);
      const len = rand(1.2, 4.4);
      const speed = rand(26, 46);
      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y - len;
      positions[i * 6 + 5] = z;
      rainData.push({ x, y, z, len, speed });
    }
    rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    rainRoot = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({
      color: 0xbfe6ff,
      transparent: true,
      opacity: 0.52,
      depthWrite: false
    }));
    rainRoot.visible = false;
    rainRoot.frustumCulled = false;
    rainRoot.name = 'Rain';
    scene.add(rainRoot);
  }

  function updateRain(dt) {
    if (!state.rain || !rainRoot) return;
    const arr = rainGeo.attributes.position.array;
    for (let i = 0; i < RAIN_COUNT; i++) {
      const d = rainData[i];
      d.y -= d.speed * dt;
      if (d.y < -14) {
        d.y = rand(58, 84);
        d.x = rand(-105, 105);
        d.z = rand(-105, 105);
      }
      const o = i * 6;
      arr[o] = d.x;
      arr[o + 1] = d.y;
      arr[o + 2] = d.z;
      arr[o + 3] = d.x;
      arr[o + 4] = d.y - d.len;
      arr[o + 5] = d.z;
    }
    rainGeo.attributes.position.needsUpdate = true;
    if (cars.length) rainRoot.position.copy(cars[0].position);

    state.lightningTimer -= dt;
    if (state.lightningTimer <= 0) {
      flashLightning();
      state.lightningTimer = rand(8, 18);
    }
  }

  function flashLightning() {
    if (!dom.lightning) return;
    dom.lightning.classList.remove('flash');
    void dom.lightning.offsetWidth;
    dom.lightning.classList.add('flash');
    if (audio) setTimeout(() => audio.thunder(), 260);
    setTimeout(() => dom.lightning.classList.remove('flash'), 700);
  }

  function applyStormLighting() {
    const night = state.tod === 'night';
    const dusk = state.tod === 'dusk';
    if (skyMat) {
      skyMat.uniforms.topColor.value.setHex(night ? 0x050d14 : dusk ? 0x20202c : 0x18272f);
      skyMat.uniforms.bottomColor.value.setHex(night ? 0x12222b : dusk ? 0x6b5a5a : 0x788d92);
    }
    if (scene && scene.fog) {
      scene.fog.color.setHex(night ? 0x0d171d : dusk ? 0x5b4d4d : 0x5f7379);
      scene.fog.near = 90;
      scene.fog.far = 980;
    }
    if (hemiLight) hemiLight.intensity = 0.34;
    if (sunLight) {
      sunLight.intensity = 0.22;
      sunLight.color.setHex(0xaebfc9);
    }
    if (ambientLight) ambientLight.intensity = 0.13;
    if (renderer) renderer.toneMappingExposure = 0.76;
    if (buildingMat) buildingMat.emissiveIntensity = night ? 0.65 : 0.16;
    if (lowriseMat) lowriseMat.emissiveIntensity = night ? 0.5 : 0.1;
    if (glassMat) glassMat.emissiveIntensity = night ? 0.4 : 0.22;
    if (billboardMats) billboardMats.forEach((m) => { m.userData.base = night ? 1.3 : 0.85; });
    if (headlightMats) headlightMats.forEach((m) => { m.emissiveIntensity = 2.4; });
    if (headlightSprites) headlightSprites.forEach((s) => { s.material.opacity = 0.95; });
    if (sunSprite) sunSprite.material.opacity = 0.02;
    if (starField) starField.material.opacity = night ? 0.45 : 0;
    if (rainRoot) rainRoot.material.opacity = night ? 0.42 : 0.52;
  }

  function setRain(active, silent) {
    state.rain = !!active;
    document.body.classList.toggle('is-raining', state.rain);
    if (dom.rainBtn) {
      dom.rainBtn.classList.toggle('is-active', state.rain);
      dom.rainBtn.textContent = state.rain ? '🌧' : '🌦';
    }
    if (rainRoot) rainRoot.visible = state.rain;
    if (audio) audio.setRain(state.rain);
    if (state.rain) {
      state.lightningTimer = rand(4, 10);
      applyStormLighting();
    } else {
      setTimeOfDay(state.tod, true);
    }
    if (!silent) toast(state.rain ? t('rainOn') : t('rainOff'), state.rain ? 'gold' : '');
  }

  /* ---------------------------------------------------------------------------
     Web Audio synthesizer
     ------------------------------------------------------------------------ */

  function createAudioEngine() {
    return {
      ctx: null,
      master: null,
      motorGain: null,
      motorFilter: null,
      motorOsc1: null,
      motorOsc2: null,
      whineGain: null,
      whineOsc: null,
      brakeGain: null,
      ambientGain: null,
      engineBus: null,
      paGain: null,
      compressor: null,
      rainGain: null,
      musicGain: null,
      musicTimer: null,
      musicStep: 0,
      noiseBuffer: null,
      engineLevel: 0.15,
      paLevel: 1.0,
      muted: false,

      start() {
        if (this.ctx) {
          if (this.ctx.state === 'suspended') this.ctx.resume();
          return;
        }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.75;
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 20;
        this.compressor.ratio.value = 6;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        this.master.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);

        // Separate buses keep the traction hum under the PA.
        this.engineBus = this.ctx.createGain();
        this.engineBus.gain.value = state.engineVolume;
        this.engineBus.connect(this.master);
        this.paGain = this.ctx.createGain();
        this.paGain.gain.value = state.paVolume;
        this.paGain.connect(this.master);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = state.musicVolume;
        this.musicGain.connect(this.master);
        if (state.musicEnabled) this.startMusic();

        // Noise buffer for track joints, brake squeal and city ambience.
        const len = Math.floor(this.ctx.sampleRate * 1.4);
        this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

        // Electric motor hum.
        this.motorGain = this.ctx.createGain();
        this.motorGain.gain.value = 0.0;
        this.motorFilter = this.ctx.createBiquadFilter();
        this.motorFilter.type = 'bandpass';
        this.motorFilter.frequency.value = 620;
        this.motorFilter.Q.value = 0.55;
        this.motorOsc1 = this.ctx.createOscillator();
        this.motorOsc1.type = 'sine';
        this.motorOsc1.frequency.value = 180;
        this.motorOsc2 = this.ctx.createOscillator();
        this.motorOsc2.type = 'triangle';
        this.motorOsc2.frequency.value = 360;
        this.motorOsc1.connect(this.motorFilter);
        this.motorOsc2.connect(this.motorFilter);
        this.motorFilter.connect(this.motorGain);
        this.motorGain.connect(this.engineBus);
        this.motorOsc1.start();
        this.motorOsc2.start();

        this.whineGain = this.ctx.createGain();
        this.whineGain.gain.value = 0.0;
        this.whineOsc = this.ctx.createOscillator();
        this.whineOsc.type = 'sine';
        this.whineOsc.frequency.value = 900;
        this.whineOsc.connect(this.whineGain);
        this.whineGain.connect(this.engineBus);
        this.whineOsc.start();

        // Brake squeal.
        this.brakeGain = this.ctx.createGain();
        this.brakeGain.gain.value = 0.0;
        const brakeFilter = this.ctx.createBiquadFilter();
        brakeFilter.type = 'bandpass';
        brakeFilter.frequency.value = 1900;
        brakeFilter.Q.value = 1.1;
        const brakeNoise = this.ctx.createBufferSource();
        brakeNoise.buffer = this.noiseBuffer;
        brakeNoise.loop = true;
        brakeNoise.connect(brakeFilter);
        brakeFilter.connect(this.brakeGain);
        this.brakeGain.connect(this.engineBus);
        brakeNoise.start();

        // City ambience.
        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.value = 0.012;
        const ambFilter = this.ctx.createBiquadFilter();
        ambFilter.type = 'lowpass';
        ambFilter.frequency.value = 420;
        const ambNoise = this.ctx.createBufferSource();
        ambNoise.buffer = this.noiseBuffer;
        ambNoise.loop = true;
        ambNoise.connect(ambFilter);
        ambFilter.connect(this.ambientGain);
        this.ambientGain.connect(this.engineBus);
        ambNoise.start();

        // Rain bed (activated by the storm toggle).
        this.rainGain = this.ctx.createGain();
        this.rainGain.gain.value = state.rain ? 0.034 : 0;
        const rainHP = this.ctx.createBiquadFilter();
        rainHP.type = 'highpass';
        rainHP.frequency.value = 700;
        const rainLP = this.ctx.createBiquadFilter();
        rainLP.type = 'lowpass';
        rainLP.frequency.value = 5200;
        const rainNoise = this.ctx.createBufferSource();
        rainNoise.buffer = this.noiseBuffer;
        rainNoise.loop = true;
        rainNoise.connect(rainHP);
        rainHP.connect(rainLP);
        rainLP.connect(this.rainGain);
        this.rainGain.connect(this.master);
        rainNoise.start();
      },

      setMuted(muted) {
        this.muted = muted;
        if (this.ctx && this.master) {
          this.master.gain.setTargetAtTime(muted ? 0 : 0.75, this.ctx.currentTime, 0.04);
        }
        if (muted && window.speechSynthesis) window.speechSynthesis.cancel();
      },

      setEngineVolume(value) {
        this.engineLevel = value;
        if (this.ctx && this.engineBus) {
          this.engineBus.gain.setTargetAtTime(value, this.ctx.currentTime, 0.12);
        }
      },

      setAnnounceVolume(value) {
        this.paLevel = value;
        if (this.ctx && this.paGain) {
          this.paGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.08);
        }
      },

      setMusicVolume(value) {
        if (this.ctx && this.musicGain) {
          this.musicGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.2);
        }
      },

      setMusicEnabled(on) {
        if (on) {
          this.startMusic();
        } else if (this.musicTimer) {
          clearInterval(this.musicTimer);
          this.musicTimer = null;
        }
      },

      musicNote(freq, start, dur, gainValue, type) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(start);
        osc.stop(start + dur + 0.02);
      },

      startMusic() {
        if (this.musicTimer || !this.ctx || !this.musicGain) return;
        const patternA = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 698.46, 523.25, 659.25, 783.99, 1046.5, 880.0, 783.99, 659.25, 587.33];
        const patternB = [659.25, 783.99, 880.0, 783.99, 698.46, 587.33, 523.25, 587.33, 659.25, 880.0, 1046.5, 880.0, 783.99, 698.46, 587.33, 523.25];
        this.musicStep = 0;
        this.musicTimer = setInterval(() => {
          if (!this.ctx || this.ctx.state !== 'running') return;
          if (!state.musicEnabled || state.muted) return;
          const pattern = Math.floor(this.musicStep / 16) % 2 === 0 ? patternA : patternB;
          const freq = pattern[this.musicStep % 16];
          const now = this.ctx.currentTime;
          this.musicNote(freq, now, 0.9, 0.032, 'sine');
          this.musicNote(freq * 2, now + 0.02, 0.7, 0.012, 'triangle');
          if (this.musicStep % 4 === 0) {
            this.musicNote(freq / 2, now, 2.0, 0.016, 'sine');
          }
          if (this.musicStep % 8 === 0) {
            [261.63, 329.63, 392.0].forEach((f, i) => this.musicNote(f, now + i * 0.06, 3.0, 0.01, 'sine'));
          }
          this.musicStep++;
        }, 620);
      },

      setRain(active) {
        if (!this.ctx || !this.rainGain) return;
        this.rainGain.gain.setTargetAtTime(active ? 0.034 : 0, this.ctx.currentTime, 0.5);
      },

      thunder() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 180;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.14, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        src.start(now);
        src.stop(now + 1.7);
      },

      setSpeed(kmh, braking, emergency) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const moving = kmh > 0.5;
        this.motorGain.gain.setTargetAtTime(moving ? 0.005 + kmh * 0.00022 : 0, now, 0.18);
        this.motorOsc1.frequency.setTargetAtTime(170 + kmh * 3.2, now, 0.18);
        this.motorOsc2.frequency.setTargetAtTime(340 + kmh * 6.4, now, 0.18);
        this.motorFilter.frequency.setTargetAtTime(540 + kmh * 3.0, now, 0.18);
        this.whineGain.gain.setTargetAtTime(moving ? 0.001 + kmh * 0.000022 : 0, now, 0.22);
        this.whineOsc.frequency.setTargetAtTime(820 + kmh * 6.8, now, 0.22);
        this.brakeGain.gain.setTargetAtTime((braking || emergency) && kmh > 4 ? 0.004 + kmh * 0.00008 : 0, now, 0.14);
        this.ambientGain.gain.setTargetAtTime(0.004, now, 0.5);
      },

      thud() {
        if (!this.ctx) return;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 150;
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        src.start(now);
        src.stop(now + 0.1);
      },

      tone(freq, start, dur, gainValue, type) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(this.paGain);
        osc.start(start);
        osc.stop(start + dur + 0.02);
      },

      chime(kind) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime + 0.01;
        if (kind === 'pa') {
          this.tone(523.25, now, 0.45, 0.12, 'sine');
          this.tone(659.25, now + 0.28, 0.5, 0.11, 'sine');
          this.tone(783.99, now + 0.56, 0.65, 0.10, 'sine');
        } else {
          this.tone(659.25, now, 0.35, 0.11, 'triangle');
          this.tone(880.0, now + 0.24, 0.5, 0.10, 'triangle');
        }
      },

      horn() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        filter.connect(this.paGain);
        [311, 370].forEach((f) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.value = f;
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.06, now + 0.03);
          gain.gain.setValueAtTime(0.06, now + 0.42);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
          osc.connect(gain);
          gain.connect(filter);
          osc.start(now);
          osc.stop(now + 0.72);
        });
      },

      click() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        this.tone(1250, now, 0.045, 0.022, 'square');
      },

      doorBeeps() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [0, 0.18, 0.36].forEach((offset) => {
          this.tone(1180, now + offset, 0.09, 0.085, 'square');
        });
      }
    };
  }

  function initAudio() {
    audio = createAudioEngine();
    if (state.muted) audio.setMuted(true);
  }

  function ensureAudio() {
    if (!audio) initAudio();
    audio.start();
    state.voiceUnlocked = true;
    if (window.speechSynthesis) window.speechSynthesis.getVoices();
  }

  function playDoorChime(opening) {
    if (audio) audio.chime(opening ? 'door' : 'door');
  }

  function playPAChime() {
    if (audio) audio.chime('pa');
  }

  const AUDIO_KEY = 'bts_audio_v1';

  function loadAudioSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(AUDIO_KEY) || 'null');
      if (saved) {
        if (typeof saved.engine === 'number') state.engineVolume = clamp(saved.engine, 0, 1);
        if (typeof saved.pa === 'number') state.paVolume = clamp(saved.pa, 0, 1);
        if (typeof saved.voice === 'boolean') state.voiceEnabled = saved.voice;
        if (typeof saved.tourist === 'boolean') state.touristInfo = saved.tourist;
        if (typeof saved.music === 'number') state.musicVolume = clamp(saved.music, 0, 1);
        if (typeof saved.musicEnabled === 'boolean') state.musicEnabled = saved.musicEnabled;
      }
    } catch (e) { /* ignore storage failures */ }
  }

  function saveAudioSettings() {
    try {
      localStorage.setItem(AUDIO_KEY, JSON.stringify({
        engine: state.engineVolume,
        pa: state.paVolume,
        voice: state.voiceEnabled,
        tourist: state.touristInfo,
        music: state.musicVolume,
        musicEnabled: state.musicEnabled
      }));
    } catch (e) { /* ignore storage failures */ }
  }

  function pickSpeechVoice(prefix) {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    const wanted = prefix === 'th'
      ? ['th-th', 'th']
      : ['en-gb', 'en-us', 'en'];
    for (const lang of wanted) {
      const exact = voices.find((v) => v.lang && v.lang.toLowerCase() === lang);
      if (exact) return exact;
    }
    return voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(prefix)) || null;
  }

  function speakAnnouncement(thText, enText) {
    if (!state.voiceEnabled || state.muted || state.paVolume <= 0.01 || !state.voiceUnlocked) return;
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    if (state.speechTimer) clearTimeout(state.speechTimer);
    synth.cancel();
    const token = ++state.speechToken;
    state.lastSpeech = thText + ' / ' + enText;
    state.speechTimer = setTimeout(() => {
      if (token !== state.speechToken) return;
      if (!state.voiceEnabled || state.muted || state.paVolume <= 0.01 || !state.voiceUnlocked) return;
      const th = new SpeechSynthesisUtterance(thText);
      th.lang = 'th-TH';
      const thVoice = pickSpeechVoice('th');
      if (thVoice) th.voice = thVoice;
      th.rate = 0.9;
      th.pitch = 1.0;
      th.volume = state.paVolume;

      const en = new SpeechSynthesisUtterance(enText);
      en.lang = 'en-GB';
      const enVoice = pickSpeechVoice('en');
      if (enVoice) en.voice = enVoice;
      en.rate = 0.94;
      en.pitch = 1.0;
      en.volume = state.paVolume;

      let englishSpoken = false;
      const speakEnglish = () => {
        if (englishSpoken || token !== state.speechToken) return;
        englishSpoken = true;
        if (!state.voiceEnabled || state.muted) return;
        synth.speak(en);
      };
      th.onend = speakEnglish;
      th.onerror = speakEnglish;
      synth.speak(th);
      // Safety net for browsers that never fire onend for a missing Thai voice.
      setTimeout(() => {
        if (token === state.speechToken && !synth.speaking && !synth.pending) speakEnglish();
      }, 7000);
    }, 720);
  }

  function stationAnnouncement(st, arrival) {
    const linesEn = st.interchange.map((key) => INTERCHANGES[key].name).join(' and ');
    const linesTh = st.interchange.map((key) => INTERCHANGES_TH[key]).join(' และ ');
    const isTerminus = st.index === 0 || st.index === STATIONS.length - 1;
    const doorSide = st.code === 'CEN' ? 'right' : (st.index % 6 === 0 ? 'right' : 'left');
    let th;
    let en;

    if (arrival) {
      th = 'สถานี' + st.th;
      en = st.en + ' Station.';
      if (doorSide === 'right') {
        th += ' ประตูรถจะเปิดทางด้านขวา';
        en += ' Doors will open on the right hand side.';
      }
      th += ' โปรดใช้ความระมัดระวังขณะก้าวออกจากรถ';
      en += ' Please mind the gap between train and platform.';
      if (isTerminus) {
        th += ' สถานีปลายทาง ขอบคุณที่ใช้บริการรถไฟฟ้าบีทีเอส';
        en += ' This is the terminal station. Thank you for travelling with BTS.';
      }
      return { th, en };
    }

    if (st.code === 'CEN') {
      return {
        th: 'สถานีต่อไป สยาม สถานีเชื่อมต่อระหว่างสายสุขุมวิทและสายสีลม ผู้โดยสารที่ต้องการเดินทางไปสถานีสนามกีฬาแห่งชาติ หรือไปทางสถานีบางหว้า โปรดเปลี่ยนเส้นทางที่สถานีนี้ ประตูรถจะเปิดทางด้านขวาค่ะ',
        en: 'Next station, Siam. Interchange between the Sukhumvit Line and the Silom Line. Passengers travelling to National Stadium or Bang Wa, please change at this station. Doors will open on the right hand side.'
      };
    }

    th = 'สถานีต่อไป ' + st.th;
    en = 'Next station, ' + st.en + '.';
    if (st.interchange.length) {
      th += ' ผู้โดยสารสามารถเปลี่ยนเส้นทางไป ' + linesTh + ' ได้ที่สถานีนี้';
      en += ' Interchange with ' + linesEn + '.';
    }
    if (isTerminus) {
      return {
        th: 'สถานีต่อไป ' + st.th + ' ซึ่งเป็นสถานีปลายทาง ผู้โดยสารทุกท่านโปรดนำสัมภาระและสิ่งของมีค่าออกจากรถไฟฟ้า ขอบคุณค่ะ',
        en: 'Next station, ' + st.en + ', the terminal station. Please ensure you have all your personal belongings with you. Thank you.'
      };
    }
    if (state.firstAnnouncement) {
      th = 'สวัสดีค่ะ รถไฟฟ้าบีทีเอสยินดีต้อนรับค่ะ ' + th;
      en = 'Welcome aboard the BTS Sukhumvit Line. ' + en;
    }
    if (state.touristInfo) {
      th += ' สถานที่ใกล้เคียง ' + st.landmarkTh;
      en += ' Nearby: ' + st.landmark + '.';
    }
    return { th, en };
  }

  function updateAudioMixerUI() {
    if (!dom.engineVol) return;
    dom.engineVol.value = String(Math.round(state.engineVolume * 100));
    dom.engineVolVal.textContent = Math.round(state.engineVolume * 100) + '%';
    dom.paVol.value = String(Math.round(state.paVolume * 100));
    dom.paVolVal.textContent = Math.round(state.paVolume * 100) + '%';
    dom.musicVol.value = String(Math.round(state.musicVolume * 100));
    dom.musicVolVal.textContent = Math.round(state.musicVolume * 100) + '%';
    dom.voiceToggle.textContent = state.voiceEnabled ? t('paVoiceOn') : t('paVoiceOff');
    dom.voiceToggle.classList.toggle('is-off', !state.voiceEnabled);
    dom.touristToggle.textContent = state.touristInfo ? t('touristOn') : t('touristOff');
    dom.touristToggle.classList.toggle('is-off', !state.touristInfo);
    dom.musicToggle.textContent = state.musicEnabled ? t('musicOn') : t('musicOff');
    dom.musicToggle.classList.toggle('is-off', !state.musicEnabled);
  }

  /* ---------------------------------------------------------------------------
     Kinematics, auto pilot and doors
     ------------------------------------------------------------------------ */

  I18N.en.clear = 'CLEAR';
  I18N.en.approach = 'APPROACH';
  I18N.en.terminusLabel = 'TERMINUS';
  I18N.th.clear = 'ปลอดภัย';
  I18N.th.approach = 'เข้าใกล้';
  I18N.th.terminusLabel = 'ปลายทาง';

  function findNextIndex() {
    if (state.direction > 0) {
      for (let i = 0; i < STATIONS.length; i++) {
        if (STATIONS[i].chainage > state.distance + 0.5) return i;
      }
      return STATIONS.length - 1;
    }
    for (let i = STATIONS.length - 1; i >= 0; i--) {
      if (STATIONS[i].chainage < state.distance - 0.5) return i;
    }
    return 0;
  }

  function findCurrentIndex() {
    if (state.direction > 0) {
      for (let i = STATIONS.length - 1; i >= 0; i--) {
        if (STATIONS[i].chainage <= state.distance + 1.2) return i;
      }
      return 0;
    }
    for (let i = 0; i < STATIONS.length; i++) {
      if (STATIONS[i].chainage >= state.distance - 1.2) return i;
    }
    return STATIONS.length - 1;
  }

  function nearestStation() {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < STATIONS.length; i++) {
      const d = Math.abs(STATIONS[i].chainage - state.distance);
      if (d < bestD) { bestD = d; best = i; }
    }
    return { index: best, distance: bestD };
  }

  function isAtPlatform() {
    return nearestStation().distance < 26 && state.speed < 1.2;
  }

  function terminusAhead() {
    return (state.direction > 0 && state.currentIndex === STATIONS.length - 1) ||
      (state.direction < 0 && state.currentIndex === 0);
  }

  function setStation(index, opts) {
    opts = opts || {};
    index = clamp(index, 0, STATIONS.length - 1);
    const st = STATIONS[index];
    state.distance = st.chainage;
    state.speed = 0;
    state.throttle = 0;
    state.brake = false;
    state.emergency = false;
    state.auto = false;
    state.doorsOpen = false;
    state.doorAnim = 0;
    state.atStation = true;
    state.dwell = 0;
    state.autoState = 'idle';
    state.currentIndex = index;
    state.direction = index === STATIONS.length - 1 ? -1 : 1;
    state.nextIndex = findNextIndex();
    state.lastAnnouncedNext = -1;
    state.lastArrival = -1;
    state.travelled = 0;
    state.cabYaw = 0;
    state.cabPitch = 0;
    if (dom.throttle) dom.throttle.value = '0';
    updateTrainTransform();
    updateDoors(0);
    updateHUD(true);
    updateControlsUI();
    if (!opts.silent) {
      toast(fill(t('jumpStation'), { station: st.en + ' (' + st.code + ')' }), 'gold');
      announceStation(true);
    }
  }

  function setAuto(on, silent) {
    state.auto = !!on;
    if (state.auto) {
      state.brake = false;
      state.emergency = false;
      state.autoState = state.atStation ? (state.doorsOpen ? 'dwell' : 'idle') : 'run';
      if (state.doorsOpen) state.dwell = DWELL_SECONDS;
      if (!silent) {
        const next = STATIONS[state.nextIndex];
        toast(fill(t('autoOn'), { station: next ? next.en + ' (' + next.code + ')' : '—' }), 'gold');
      }
    } else {
      state.autoState = 'idle';
      if (!silent) toast(t('autoOff'));
    }
    updateControlsUI();
    updateHUD(true);
  }

  function setThrottle(value) {
    state.throttle = clamp(Number(value) || 0, 0, MAX_SPEED);
    if (state.auto) setAuto(false, true);
    state.brake = false;
    state.emergency = false;
    if (dom.throttle) dom.throttle.value = String(Math.round(state.throttle));
    updateControlsUI();
  }

  function toggleBrake() {
    if (state.auto) setAuto(false, true);
    state.brake = !state.brake;
    if (state.brake) {
      state.throttle = 0;
      if (dom.throttle) dom.throttle.value = '0';
      toast(t('brakeOn'), 'gold');
    } else {
      toast(t('brakeOff'));
    }
    updateControlsUI();
    updateHUD(true);
  }

  function applyEmergency() {
    state.emergency = true;
    state.auto = false;
    state.brake = true;
    state.throttle = 0;
    state.autoState = 'idle';
    if (dom.throttle) dom.throttle.value = '0';
    toast(t('emergencyStop'), 'danger');
    if (audio) audio.horn();
    updateControlsUI();
    updateHUD(true);
  }

  function openDoors(auto) {
    if (state.speed > 0.5) {
      toast(t('doorsLocked'), 'danger');
      return false;
    }
    if (!isAtPlatform()) {
      toast(t('notAtStation'), 'danger');
      return false;
    }
    if (state.doorsOpen) return true;
    state.doorsOpen = true;
    state.atStation = true;
    if (auto) state.autoState = 'dwell';
    if (state.started) spawnPassengerExchange();
    playDoorChime(true);
    toast(t('doorsOpening'), 'gold');
    updateHUD(true);
    return true;
  }

  function closeDoors(auto) {
    if (!state.doorsOpen) return true;
    state.doorsOpen = false;
    if (auto) state.autoState = 'closing';
    if (audio && audio.doorBeeps) audio.doorBeeps();
    else playDoorChime(false);
    if (state.started) speakAnnouncement('โปรดระวัง ประตูรถกำลังจะปิด', 'Please stand clear of the doors.');
    toast(t('doorsClosing'));
    updateHUD(true);
    return true;
  }

  function toggleDoors() {
    if (state.auto) setAuto(false, true);
    if (state.doorsOpen) closeDoors(false);
    else openDoors(false);
  }

  function reverseDirection() {
    state.direction *= -1;
    state.atStation = false;
    state.autoState = 'run';
    state.currentIndex = findCurrentIndex();
    state.nextIndex = findNextIndex();
    const next = STATIONS[state.nextIndex];
    toast(fill(t('terminusReversed'), { station: next ? next.en + ' (' + next.code + ')' : '—' }), 'gold');
    announceStation(true);
    updateHUD(true);
  }

  function manualDrive(dt) {
    if (state.emergency) {
      state.speed = Math.max(0, state.speed - EMERGENCY_DECEL * dt);
      return;
    }
    if (state.brake) {
      state.speed = Math.max(0, state.speed - BRAKE_DECEL * dt);
      return;
    }
    if (state.doorsOpen || state.doorAnim > DOOR_INTERLOCK) {
      state.speed = Math.max(0, state.speed - BRAKE_DECEL * dt);
      return;
    }
    if (state.speed < state.throttle) {
      state.speed = Math.min(state.throttle, state.speed + ACCEL * dt);
    } else if (state.speed > state.throttle) {
      state.speed = Math.max(state.throttle, state.speed - COAST_DECEL * dt);
    }
    state.speed = clamp(state.speed, 0, MAX_SPEED);
  }

  function autoDrive(dt, distToNext) {
    state.autoTarget = 0;
    state.autoDist = distToNext;
    state.autoDt = dt;
    const next = STATIONS[state.nextIndex];

    if (state.doorsOpen) {
      state.speed = 0;
      if (state.autoState === 'dwell') {
        state.dwell -= dt;
        if (state.dwell <= 0) {
          closeDoors(true);
          state.autoState = 'closing';
        }
      } else if (state.autoState === 'closing' && state.doorAnim < 0.03) {
        state.atStation = false;
        state.autoState = 'run';
        if (terminusAhead()) {
          reverseDirection();
        } else {
          const st = STATIONS[state.currentIndex];
          toast(fill(t('autoDepart'), { station: st.en + ' (' + st.code + ')' }));
        }
      }
      return;
    }

    if (state.autoState === 'closing') {
      state.speed = 0;
      if (state.doorAnim < 0.03) {
        state.atStation = false;
        state.autoState = 'run';
        if (terminusAhead()) reverseDirection();
      }
      return;
    }

    if (state.atStation && state.speed < 0.4) {
      if (state.autoState !== 'dwell' && state.autoState !== 'closing') {
        openDoors(true);
        state.dwell = DWELL_SECONDS;
        state.autoState = 'dwell';
        const st = STATIONS[state.currentIndex];
        toast(fill(t('autoArriving'), { station: st.en + ' (' + st.code + ')' }), 'gold');
      }
      return;
    }

    let target = 0;
    if (distToNext > 2.5) {
      if (distToNext < 15) {
        // Low-speed creep so the train stops on the platform mark, not 10 m short.
        target = Math.max(2.2, distToNext * 0.8);
      } else {
        const safe = Math.sqrt(2 * AUTO_DECEL * Math.max(0, distToNext - 12)) * 3.6;
        target = Math.min(AUTO_CRUISE, safe);
        if (target < 3) target = 3;
      }
    }
    state.autoTarget = target;
    if (state.speed < target) state.speed = Math.min(target, state.speed + ACCEL * dt);
    else state.speed = Math.max(target, state.speed - BRAKE_DECEL * dt);
    state.speed = clamp(state.speed, 0, MAX_SPEED);

    if (distToNext < 5.0 && state.speed < 2.8) {
      state.speed = 0;
      arriveAtStation(state.nextIndex);
    }
  }

  function arriveAtStation(index) {
    if (state.atStation && state.currentIndex === index) return;
    const st = STATIONS[index];
    state.distance = st.chainage;
    state.speed = 0;
    state.throttle = 0;
    state.currentIndex = index;
    state.atStation = true;
    state.dwell = 0;
    state.nextIndex = findNextIndex();
    if (state.auto) {
      state.autoState = 'idle';
      openDoors(true);
      state.dwell = DWELL_SECONDS;
      state.autoState = 'dwell';
    }
    if (state.started) {
      announceArrival(index);
    }
    updateHUD(true);
  }

  function updateKinematics(dt) {
    if (!state.started) return;
    const prevNext = state.nextIndex;
    const next = STATIONS[state.nextIndex];
    const distToNext = next ? Math.abs(next.chainage - state.distance) : 0;

    if (state.auto) autoDrive(dt, distToNext);
    else manualDrive(dt);

    if (state.emergency && state.speed <= 0.02) {
      state.emergency = false;
      state.speed = 0;
    }

    if (state.doorsOpen || state.doorAnim > DOOR_INTERLOCK) {
      if (state.speed > 0) state.speed = Math.max(0, state.speed - BRAKE_DECEL * dt);
    }

    state.speed = clamp(state.speed, 0, MAX_SPEED);
    if (state.speed < 0.025) state.speed = 0;

    if (state.speed > 0.02) {
      const metres = (state.speed / 3.6) * dt;
      state.distance += metres * state.direction;
      state.travelled += metres;
      if (state.speed > 0.8) state.atStation = false;
    }
    state.distance = clamp(state.distance, 0, displayTotal);

    // Positive station snap: catch the stop even if the train crept a few
    // centimetres past the chainage before the next-index update.
    if (state.auto && !state.atStation && state.speed < 3.2) {
      const approach = STATIONS[state.nextIndex];
      if (approach) {
        const approachDist = Math.abs(approach.chainage - state.distance);
        if (approachDist < 6.0) {
          state.speed = 0;
          arriveAtStation(state.nextIndex);
        }
      }
    }

    state.currentIndex = findCurrentIndex();
    state.nextIndex = findNextIndex();

    if (state.nextIndex !== prevNext && state.speed > 2) {
      announceStation(false);
    }

    const n2 = STATIONS[state.nextIndex];
    if (n2 && state.speed < 0.45) {
      const d2 = Math.abs(n2.chainage - state.distance);
      if (d2 < 1.5 && !(state.atStation && state.currentIndex === state.nextIndex)) {
        arriveAtStation(state.nextIndex);
      }
    }
  }

  function updateAudio(dt) {
    if (!audio) return;
    audio.setSpeed(state.speed, state.brake, state.emergency);
    if (state.speed > 5) {
      const joint = Math.floor(state.travelled / 13);
      if (joint !== state.lastJoint) {
        state.lastJoint = joint;
        audio.thud();
      }
    }
  }

  function updateTraffic(dt) {
    for (const car of traffic) {
      car.dist += car.speed * dt * car.dir;
      if (car.dist > displayTotal) car.dist -= displayTotal;
      if (car.dist < 0) car.dist += displayTotal;
      const p = routePointAtDisplay(car.dist);
      const tan = routeTangentAtDisplay(car.dist);
      const n = new THREE.Vector3(tan.z, 0, -tan.x);
      car.group.position.set(p.x + n.x * car.lane, 0.58, p.z + n.z * car.lane);
      car.group.quaternion.setFromUnitVectors(FORWARD_Z, tan);
      if (car.dir < 0) car.group.rotateY(Math.PI);
    }
  }

  function updateSignalLights() {
    for (let i = 0; i < STATIONS.length; i++) {
      const sig = stationSignals[i];
      if (!sig) continue;
      const d = Math.abs(STATIONS[i].chainage - state.distance);
      let mode = 'green';
      if (state.doorsOpen && i === state.currentIndex) mode = 'red';
      else if (i === state.nextIndex && d < 190) mode = 'amber';
      sig.greenMat.color.setHex(mode === 'green' ? 0x2ed47a : 0x0d2a1a);
      sig.amberMat.color.setHex(mode === 'amber' ? 0xffb340 : 0x3b2c06);
      sig.redMat.color.setHex(mode === 'red' ? 0xff3048 : 0x3b0b12);
    }
  }

  function updateBillboards(dt) {
    for (let i = 0; i < billboardMats.length; i++) {
      const mat = billboardMats[i];
      const base = mat.userData.base != null ? mat.userData.base : 0.85;
      mat.opacity = clamp(base + Math.sin(state.time * 2.3 + i * 0.7) * 0.07, 0.35, 1);
    }
  }

  /* ---------------------------------------------------------------------------
     Camera controller
     ------------------------------------------------------------------------ */

  function setView(view, silent) {
    view = clamp(view, 1, 4);
    state.view = view;
    document.body.classList.remove('view-1', 'view-2', 'view-3', 'view-4');
    document.body.classList.add('view-' + view);
    dom.viewButtons.forEach((b) => b.classList.toggle('is-active', Number(b.dataset.view) === view));
    controls.enabled = view === 3;
    controls.autoRotate = state.introMode && view === 3;

    if (view === 3 && cars.length) {
      const lead = cars[0];
      const forward = FORWARD_Z.clone().applyQuaternion(lead.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(lead.quaternion);
      camera.position.copy(lead.position)
        .addScaledVector(forward, -26)
        .addScaledVector(right, 10)
        .add(new THREE.Vector3(0, 6, 0));
      controls.target.copy(lead.position).add(new THREE.Vector3(0, 1.4, 0));
      state.orbitLast.copy(controls.target);
      controls.update();
    }
    if (view === 4) {
      state.stationCamIndex = state.nextIndex;
    }
    if (view === 1 || view === 2) {
      state.cabYaw = 0;
      state.cabPitch = 0;
    }
    if (!silent) {
      const labels = { 1: t('cabView'), 2: t('windowView'), 3: t('orbitView'), 4: t('platformView') };
      toast(labels[view]);
    }
    updateHUD(true);
  }

  function updateCameras(dt) {
    if (!cars.length) return;
    const lead = cars[0];
    const up = new THREE.Vector3(0, 1, 0);
    const forward = FORWARD_Z.clone().applyQuaternion(lead.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(lead.quaternion).normalize();

    if (state.view === 1) {
      const targetPos = lead.position.clone()
        .addScaledVector(forward, 2.12)
        .add(new THREE.Vector3(0, 1.92, 0));
      const speedFactor = state.speed / MAX_SPEED;
      targetPos.y += Math.sin(state.time * 7.2) * 0.014 * speedFactor;
      targetPos.addScaledVector(right, Math.sin(state.time * 3.4) * 0.012 * speedFactor);
      camera.position.lerp(targetPos, 1 - Math.exp(-16 * dt));
      const look = targetPos.clone()
        .addScaledVector(forward, 100)
        .add(new THREE.Vector3(0, -0.18, 0));
      camera.lookAt(look);
      camera.rotateY(state.cabYaw);
      camera.rotateX(state.cabPitch);
      setCameraFov(62 + state.speed * 0.16, dt);
    } else if (state.view === 2) {
      const car = cars[1] || cars[0];
      const carForward = FORWARD_Z.clone().applyQuaternion(car.quaternion).normalize();
      const carRight = new THREE.Vector3(1, 0, 0).applyQuaternion(car.quaternion).normalize();
      const targetPos = car.position.clone()
        .addScaledVector(carRight, 1.17)
        .add(new THREE.Vector3(0, 1.62, 0))
        .addScaledVector(carForward, 0.9);
      camera.position.lerp(targetPos, 1 - Math.exp(-12 * dt));
      const look = targetPos.clone()
        .addScaledVector(carRight, 30)
        .addScaledVector(carForward, 72)
        .add(new THREE.Vector3(0, 9, 0));
      camera.lookAt(look);
      camera.rotateY(state.cabYaw * 0.7);
      camera.rotateX(state.cabPitch * 0.55);
      setCameraFov(58, dt);
    } else if (state.view === 3) {
      const target = lead.position.clone().add(new THREE.Vector3(0, 1.4, 0));
      const delta = target.clone().sub(state.orbitLast);
      camera.position.add(delta);
      controls.target.copy(target);
      state.orbitLast.copy(target);
      controls.update();
      setCameraFov(58, dt);
    } else if (state.view === 4) {
      const si = state.nextIndex;
      const p = stationPositions[si];
      const n = stationNormal(si);
      const tan = stationTangents[si];
      const ahead = state.direction > 0 ? 12 : -12;
      const targetPos = new THREE.Vector3(
        p.x + n.x * 4.6 + tan.x * ahead,
        TRACK_Y + 3.2,
        p.z + n.z * 4.6 + tan.z * ahead
      );
      camera.position.lerp(targetPos, 1 - Math.exp(-4.2 * dt));
      const look = new THREE.Vector3(
        p.x - tan.x * 60 * state.direction,
        TRACK_Y + 1.15,
        p.z - tan.z * 60 * state.direction
      );
      camera.lookAt(look);
      const dist = Math.abs(STATIONS[si].chainage - state.distance);
      setCameraFov(clamp(66 - dist * 0.018, 40, 66), dt);
    }

    if (state.introMode && state.view === 3) {
      const target = lead.position.clone().add(new THREE.Vector3(0, 1.4, 0));
      controls.target.copy(target);
      controls.update();
    }
  }

  function setCameraFov(value, dt) {
    const next = lerp(camera.fov, value, 1 - Math.exp(-5 * dt));
    if (Math.abs(next - camera.fov) > 0.01) {
      camera.fov = next;
      camera.updateProjectionMatrix();
    }
  }

  /* ---------------------------------------------------------------------------
     Bilingual HUD, minimap and announcements
     ------------------------------------------------------------------------ */

  I18N.en.arriving = 'NOW ARRIVING';
  I18N.th.arriving = 'กำลังถึงสถานี';
  I18N.en.atPlatform = 'AT PLATFORM';
  I18N.th.atPlatform = 'ที่ชานชาลา';

  function buildHUD() {
    minimapCtx = dom.minimap ? dom.minimap.getContext('2d') : null;
    loadAudioSettings();
    renderStationList();
    updateControlsUI();
    updateAudioMixerUI();
  }

  function renderStationList() {
    if (!dom.stationList) return;
    dom.stationList.innerHTML = STATIONS.map((s, i) => {
      const zone = ZONES[s.zone];
      const badges = s.interchange.map((key) => {
        const ix = INTERCHANGES[key];
        return '<i style="--c:' + ix.color + '" title="' + escapeHtml(ix.name) + '"></i>';
      }).join('');
      return '<button class="station-item" type="button" data-index="' + i + '" style="--z:' + zone.css + '">' +
        '<span class="s-code">' + s.code + '</span>' +
        '<span class="s-name"><b>' + escapeHtml(s.en) + '</b><em>' + escapeHtml(s.th) + '</em></span>' +
        '<span class="s-badges">' + badges + '</span>' +
        '</button>';
    }).join('');
    updateStationListClasses();
  }

  function updateStationListClasses() {
    if (!dom.stationList) return;
    const items = dom.stationList.children;
    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      el.classList.toggle('is-current', i === state.currentIndex);
      el.classList.toggle('is-next', i === state.nextIndex && state.nextIndex !== state.currentIndex);
      const passed = state.direction > 0 ? i < state.currentIndex : i > state.currentIndex;
      el.classList.toggle('is-passed', passed);
    }
    const focus = (state.atStation && state.speed < 1) ? state.currentIndex : state.nextIndex;
    if (focus !== state.lastStationList) {
      state.lastStationList = focus;
      const focusEl = items[focus];
      if (focusEl && focusEl.scrollIntoView) {
        try { focusEl.scrollIntoView({ block: 'nearest' }); } catch (e) { /* noop */ }
      }
    }
  }

  function updateHUD(force) {
    if (!dom.speedValue) return;
    const next = STATIONS[state.nextIndex] || STATIONS[state.currentIndex] || STATIONS[0];
    const focus = (state.atStation && state.speed < 1) ? STATIONS[state.currentIndex] : next;
    const zone = ZONES[focus.zone];
    const dist = Math.abs(next.chainage - state.distance);
    const pct = (state.speed / MAX_SPEED) * 100;

    dom.speedValue.textContent = String(Math.round(state.speed));
    dom.speedRing.style.setProperty('--pct', pct.toFixed(1));

    dom.modeChip.textContent = state.auto ? t('auto') : t('manual');
    dom.modeChip.classList.toggle('auto', state.auto);

    dom.doorChip.textContent = state.doorsOpen ? t('doorsOpen') : t('doorsClosed');
    dom.doorChip.classList.toggle('open', state.doorsOpen);

    const tractionOn = Math.ceil(state.throttle / 16);
    dom.throttleBars.forEach((bar, i) => bar.classList.toggle('on', i < tractionOn));

    let signalText = t('clear');
    let signalClass = '';
    if (state.doorsOpen) { signalText = t('doorsOpen'); signalClass = 'red'; }
    else if (state.emergency) { signalText = t('emergency'); signalClass = 'red'; }
    else if (dist < 190) { signalText = t('approach'); signalClass = 'amber'; }
    dom.signalChip.textContent = '● ' + signalText;
    dom.signalChip.classList.toggle('amber', signalClass === 'amber');
    dom.signalChip.classList.toggle('red', signalClass === 'red');

    dom.nextCode.textContent = next.code;
    dom.nextName.textContent = next.en;
    dom.nextThai.textContent = next.th;
    dom.distanceValue.textContent = formatDistance(dist);

    let eta = 0;
    if (!state.doorsOpen && dist > 0.5) {
      if (state.speed > 1) eta = dist / (state.speed / 3.6);
      else eta = Math.sqrt((2 * Math.max(0, dist)) / AUTO_DECEL);
    }
    dom.etaValue.textContent = state.doorsOpen ? '--' : formatEta(eta);

    dom.zoneValue.textContent = zone.key;
    dom.zoneChip.textContent = 'ZONE ' + zone.key;
    dom.zoneChip.style.background = zone.css;
    dom.zoneDesc.textContent = state.lang === 'th' ? zone.thDesc : zone.desc;
    dom.routeProgress.style.width = clamp((state.distance / displayTotal) * 100, 0, 100).toFixed(2) + '%';

    const ixHtml = focus.interchange.length
      ? focus.interchange.map((key) => {
        const ix = INTERCHANGES[key];
        return '<span class="line-chip" style="--c:' + ix.color + '"><i></i>' + escapeHtml(ix.short) + '</span>';
      }).join('')
      : '<span class="line-chip empty">' + escapeHtml(t('noInterchange')) + '</span>';
    if (dom.interchangeChips.innerHTML !== ixHtml) dom.interchangeChips.innerHTML = ixHtml;

    dom.landmarkName.textContent = state.lang === 'th' ? focus.landmarkTh : focus.landmark;
    dom.throttleValue.textContent = Math.round(state.throttle) + ' km/h';

    dom.announceDetail.textContent = next.interchange.length
      ? fill(t('interchanges'), { lines: next.interchange.map((k) => INTERCHANGES[k].name).join(' · ') })
      : zone.label + ' · ' + zone.desc;
    if (dom.announceDetailTh) {
      dom.announceDetailTh.textContent = next.interchange.length
        ? fill(t('interchanges'), { lines: next.interchange.map((k) => INTERCHANGES[k].name).join(' · ') })
        : zone.th + ' · ' + zone.thDesc;
    }

    dom.cabSpeed.textContent = String(Math.round(state.speed));
    dom.cabDoor.textContent = state.doorsOpen ? t('doorsOpen') : t('doorsClosed');
    dom.cabDoor.classList.toggle('open', state.doorsOpen);
    dom.cabWarning.classList.toggle('show', state.doorsOpen || state.doorAnim > DOOR_INTERLOCK);
    dom.cabSignal.className = signalClass === 'red' ? 'red' : signalClass === 'amber' ? 'amber' : 'green';
    dom.cabSignalText.textContent = signalText;
    dom.cabTractionBars = dom.cabTractionBars || $$('.cab-traction i');
    dom.cabTractionBars.forEach((bar, i) => bar.classList.toggle('on', i < tractionOn));

    dom.passengerStation.textContent = state.atStation && state.speed < 1
      ? STATIONS[state.currentIndex].en.toUpperCase() + ' → ' + next.en.toUpperCase()
      : next.en.toUpperCase();
    const atNext = state.atStation && state.currentIndex === state.nextIndex;
    dom.stationCamName.textContent = next.en + ' (' + next.code + ')';
    dom.stationCamEta.textContent = atNext
      ? t('atPlatform')
      : (state.doorsOpen ? t('doorsOpenAt').replace('{station}', next.en) : fill(t('arrivingIn'), { time: formatEta(eta) }));

    document.body.classList.toggle('is-moving', state.speed > 1);
    updateStationListClasses();
    updateControlsUI();
    state.lastHud = state.time;
  }

  function updateMinimap() {
    if (!minimapCtx) return;
    const ctx = minimapCtx;
    const w = dom.minimap.width;
    const h = dom.minimap.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(2, 16, 10, 0.4)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(46, 212, 122, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 24) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    stationPositions.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    });
    const pad = 18;
    const sx = (w - pad * 2) / Math.max(1, maxX - minX);
    const sz = (h - pad * 2) / Math.max(1, maxZ - minZ);
    const ox = pad;
    const oz = pad;
    const map = (p) => ({ x: ox + (p.x - minX) * sx, y: oz + (p.z - minZ) * sz });

    ctx.lineCap = 'round';
    for (let i = 0; i < STATIONS.length - 1; i++) {
      const a = map(stationPositions[i]);
      const b = map(stationPositions[i + 1]);
      ctx.strokeStyle = ZONES[STATIONS[i].zone].css;
      ctx.globalAlpha = 0.82;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < STATIONS.length; i++) {
      const p = map(stationPositions[i]);
      ctx.fillStyle = ZONES[STATIONS[i].zone].css;
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === state.currentIndex ? 3.4 : 1.8, 0, Math.PI * 2);
      ctx.fill();
      if (STATIONS[i].interchange.length) {
        ctx.strokeStyle = 'rgba(255,255,255,0.72)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.1, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const trainP = routePointAtDisplay(state.distance);
    const tp = map(trainP);
    const tan = routeTangentAtDisplay(state.distance);
    const angle = Math.atan2(tan.z, tan.x);
    ctx.save();
    ctx.translate(tp.x, tp.y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.shadowColor = '#2ed47a';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#eafff4';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(234,255,244,0.62)';
    ctx.font = '700 8px Orbitron, sans-serif';
    ctx.fillText('N24', 6, 11);
    ctx.fillText('E23', w - 22, h - 5);
  }

  function announceStation(force) {
    const next = STATIONS[state.nextIndex] || STATIONS[state.currentIndex];
    if (!next) return;
    if (!force && state.nextIndex === state.lastAnnouncedNext) return;
    state.lastAnnouncedNext = state.nextIndex;
    const zone = ZONES[next.zone];
    dom.announceKicker.textContent = t('nextStation');
    dom.announceName.textContent = next.en + ' (' + next.code + ') · ' + next.th;
    dom.announceDetail.textContent = next.interchange.length
      ? fill(t('interchanges'), { lines: next.interchange.map((k) => INTERCHANGES[k].name).join(' · ') })
      : zone.label + ' · ' + zone.desc;
    if (dom.announceDetailTh) {
      dom.announceDetailTh.textContent = next.interchange.length
        ? fill(t('interchanges'), { lines: next.interchange.map((k) => INTERCHANGES[k].name).join(' · ') })
        : zone.th + ' · ' + zone.thDesc;
    }
    dom.announce.classList.remove('is-alert');
    if (state.started) {
      playPAChime();
      const line = stationAnnouncement(next, false);
      speakAnnouncement(line.th, line.en);
      state.firstAnnouncement = false;
    }
  }

  function announceArrival(index) {
    const st = STATIONS[index];
    if (!st) return;
    const zone = ZONES[st.zone];
    dom.announceKicker.textContent = t('arriving');
    dom.announceName.textContent = st.en + ' (' + st.code + ') · ' + st.th;
    dom.announceDetail.textContent = zone.label + ' · ' + zone.desc;
    if (dom.announceDetailTh) dom.announceDetailTh.textContent = zone.th + ' · ' + zone.thDesc;
    dom.announce.classList.add('is-alert');
    if (state.started) {
      playPAChime();
      const line = stationAnnouncement(st, true);
      speakAnnouncement(line.th, line.en);
    }
    if (state.announceTimer) clearTimeout(state.announceTimer);
    state.announceTimer = setTimeout(() => {
      dom.announce.classList.remove('is-alert');
      announceStation(true);
    }, 5200);
  }

  function toast(message, tone) {
    if (!dom.toasts) return;
    while (dom.toasts.children.length > 3) dom.toasts.removeChild(dom.toasts.firstChild);
    const el = document.createElement('div');
    el.className = 'toast' + (tone ? ' ' + tone : '');
    el.textContent = message;
    dom.toasts.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 280);
    }, 2900);
  }

  /* ---------------------------------------------------------------------------
     Language, time of day and control UI
     ------------------------------------------------------------------------ */

  function setLanguage(lang, silent) {
    state.lang = lang === 'th' ? 'th' : 'en';
    document.documentElement.lang = state.lang;
    $$('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      const value = t(key);
      if (value && value !== key) el.textContent = value;
    });
    dom.langBtn.textContent = state.lang === 'en' ? 'TH' : 'EN';
    dom.introLang.textContent = state.lang === 'en' ? 'EN / ไทย' : 'ไทย / EN';
    renderStationList();
    updateHUD(true);
    announceStation(true);
    updateControlsUI();
    updateAudioMixerUI();
    if (!silent) toast(state.lang === 'th' ? 'เปลี่ยนภาษาเป็นไทย' : 'Language: English');
  }

  function toggleLanguage() {
    setLanguage(state.lang === 'en' ? 'th' : 'en');
  }

  function setTimeOfDay(mode, silent) {
    const modes = {
      day: {
        top: 0x0f5a8c, bottom: 0xb7d2d0, fog: 0xa9c3bf, fogNear: 380, fogFar: 2700,
        hemi: 0.45, sun: 0.9, ambient: 0.12, exposure: 0.76,
        building: 0.055, glass: 0.12, neon: 0.82, head: 0.9, sunOpacity: 0.95, sunScale: 520
      },
      dusk: {
        top: 0x1a2450, bottom: 0xff8a5c, fog: 0x8a5f5a, fogNear: 150, fogFar: 1350,
        hemi: 0.3, sun: 0.36, ambient: 0.11, exposure: 0.78,
        building: 0.5, glass: 0.48, neon: 1.25, head: 2.0, sunOpacity: 0.8, sunScale: 420
      },
      night: {
        top: 0x020612, bottom: 0x0e2433, fog: 0x08131d, fogNear: 110, fogFar: 1100,
        hemi: 0.16, sun: 0.06, ambient: 0.08, exposure: 0.72,
        building: 0.92, glass: 0.62, neon: 1.45, head: 3.2, sunOpacity: 0.08, sunScale: 260
      }
    };
    const cfg = modes[mode] || modes.day;
    state.tod = mode;
    if (skyMat) {
      skyMat.uniforms.topColor.value.setHex(cfg.top);
      skyMat.uniforms.bottomColor.value.setHex(cfg.bottom);
    }
    if (scene && scene.fog) {
      scene.fog.color.setHex(cfg.fog);
      scene.fog.near = cfg.fogNear;
      scene.fog.far = cfg.fogFar;
    }
    if (hemiLight) hemiLight.intensity = cfg.hemi;
    if (sunLight) {
      sunLight.intensity = cfg.sun;
      sunLight.color.setHex(mode === 'night' ? 0x8fb6d9 : mode === 'dusk' ? 0xffb07a : 0xfff2cf);
    }
    if (ambientLight) ambientLight.intensity = cfg.ambient;
    if (renderer) renderer.toneMappingExposure = cfg.exposure;
    if (buildingMat) buildingMat.emissiveIntensity = cfg.building;
    if (lowriseMat) lowriseMat.emissiveIntensity = cfg.building * 0.7;
    if (glassMat) glassMat.emissiveIntensity = cfg.glass;
    if (billboardMats) billboardMats.forEach((m) => { m.userData.base = cfg.neon; });
    if (headlightMats) headlightMats.forEach((m) => { m.emissiveIntensity = cfg.head; });
    if (headlightSprites) headlightSprites.forEach((s) => { s.material.opacity = Math.min(1, cfg.head * 0.55); });
    if (sunSprite) {
      sunSprite.material.opacity = cfg.sunOpacity;
      sunSprite.scale.set(cfg.sunScale, cfg.sunScale, 1);
    }
    if (starField) starField.material.opacity = mode === 'night' ? 0.9 : mode === 'dusk' ? 0.22 : 0;
    if (dom.todBtn) {
      dom.todBtn.textContent = mode === 'day' ? '☀' : mode === 'dusk' ? '🌆' : '🌙';
      dom.todBtn.title = t(mode === 'day' ? 'todDay' : mode === 'dusk' ? 'todDusk' : 'todNight');
    }
    if (state.rain) applyStormLighting();
    if (!silent) toast(t(mode === 'day' ? 'todDay' : mode === 'dusk' ? 'todDusk' : 'todNight'));
  }

  function cycleTimeOfDay() {
    const order = ['day', 'dusk', 'night'];
    const next = order[(order.indexOf(state.tod) + 1) % order.length];
    setTimeOfDay(next);
  }

  function updateControlsUI() {
    if (!dom.brakeBtn) return;
    dom.brakeBtn.classList.toggle('is-active', state.brake);
    dom.emergencyBtn.classList.toggle('is-active', state.emergency);
    dom.autoBtn.classList.toggle('is-active', state.auto);
    dom.doorBtn.classList.toggle('is-active', state.doorsOpen);
    if (dom.throttle && Number(dom.throttle.value) !== Math.round(state.throttle)) {
      dom.throttle.value = String(Math.round(state.throttle));
    }
    dom.viewButtons.forEach((b) => b.classList.toggle('is-active', Number(b.dataset.view) === state.view));
  }

  function toggleMute() {
    state.muted = !state.muted;
    if (audio) audio.setMuted(state.muted);
    if (state.muted && window.speechSynthesis) { state.speechToken++; window.speechSynthesis.cancel(); }
    dom.audioBtn.textContent = state.muted ? '🔇' : '🔊';
    dom.audioBtn.classList.toggle('is-active', state.muted);
    toast(state.muted ? t('audioOff') : t('audioOn'));
  }

  function openHelp() {
    dom.helpModal.hidden = false;
    if (audio) audio.click();
  }

  function closeHelp() {
    dom.helpModal.hidden = true;
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  /* ---------------------------------------------------------------------------
     Events
     ------------------------------------------------------------------------ */

  function bindEvents() {
    dom.startSiam.addEventListener('click', () => startSimulation(23));
    dom.startKhuKhot.addEventListener('click', () => startSimulation(0));
    dom.introLang.addEventListener('click', toggleLanguage);
    dom.langBtn.addEventListener('click', toggleLanguage);
    dom.todBtn.addEventListener('click', cycleTimeOfDay);
    dom.rainBtn.addEventListener('click', () => { ensureAudio(); setRain(!state.rain); });
    dom.audioBtn.addEventListener('click', () => { ensureAudio(); toggleMute(); });
    dom.mixBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dom.audioMixer.hidden = !dom.audioMixer.hidden;
      dom.mixBtn.classList.toggle('is-active', !dom.audioMixer.hidden);
    });
    dom.mixClose.addEventListener('click', () => {
      dom.audioMixer.hidden = true;
      dom.mixBtn.classList.remove('is-active');
    });
    document.addEventListener('click', (e) => {
      if (dom.audioMixer.hidden) return;
      if (dom.audioMixer.contains(e.target) || e.target === dom.mixBtn) return;
      dom.audioMixer.hidden = true;
      dom.mixBtn.classList.remove('is-active');
    });
    dom.engineVol.addEventListener('input', (e) => {
      state.engineVolume = clamp(Number(e.target.value) / 100, 0, 1);
      if (audio) audio.setEngineVolume(state.engineVolume);
      updateAudioMixerUI();
      saveAudioSettings();
    });
    dom.paVol.addEventListener('input', (e) => {
      state.paVolume = clamp(Number(e.target.value) / 100, 0, 1);
      if (audio) audio.setAnnounceVolume(state.paVolume);
      if (state.paVolume <= 0.01 && window.speechSynthesis) window.speechSynthesis.cancel();
      updateAudioMixerUI();
      saveAudioSettings();
    });
    dom.voiceToggle.addEventListener('click', () => {
      state.voiceEnabled = !state.voiceEnabled;
      if (!state.voiceEnabled && window.speechSynthesis) { state.speechToken++; window.speechSynthesis.cancel(); }
      updateAudioMixerUI();
      saveAudioSettings();
      toast(state.voiceEnabled ? t('voiceOnToast') : t('voiceOffToast'), state.voiceEnabled ? 'gold' : '');
    });
    dom.touristToggle.addEventListener('click', () => {
      state.touristInfo = !state.touristInfo;
      updateAudioMixerUI();
      saveAudioSettings();
      toast(state.touristInfo ? t('touristOnToast') : t('touristOffToast'), state.touristInfo ? 'gold' : '');
    });
    dom.musicVol.addEventListener('input', (e) => {
      state.musicVolume = clamp(Number(e.target.value) / 100, 0, 1);
      if (audio) audio.setMusicVolume(state.musicVolume);
      updateAudioMixerUI();
      saveAudioSettings();
    });
    dom.musicToggle.addEventListener('click', () => {
      state.musicEnabled = !state.musicEnabled;
      if (audio) audio.setMusicEnabled(state.musicEnabled);
      updateAudioMixerUI();
      saveAudioSettings();
      toast(state.musicEnabled ? t('musicOnToast') : t('musicOffToast'), state.musicEnabled ? 'gold' : '');
    });
    dom.testPA.addEventListener('click', () => {
      ensureAudio();
      playPAChime();
      speakAnnouncement('สถานีต่อไป สยาม สถานที่ใกล้เคียง สกายวอล์คสยาม', 'Next station, Siam. Nearby: Siam Skywalk and Paragon.');
    });
    dom.helpBtn.addEventListener('click', openHelp);
    dom.helpClose.addEventListener('click', closeHelp);
    dom.helpOk.addEventListener('click', closeHelp);
    dom.helpModal.addEventListener('click', (e) => { if (e.target === dom.helpModal) closeHelp(); });
    dom.fullscreenBtn.addEventListener('click', toggleFullscreen);

    dom.telemetryToggle.addEventListener('click', () => {
      const min = document.body.classList.toggle('telemetry-min');
      dom.telemetryToggle.textContent = min ? '+' : '−';
      dom.telemetryToggle.setAttribute('aria-expanded', String(!min));
    });
    dom.routeToggle.addEventListener('click', () => {
      const min = document.body.classList.toggle('route-min');
      dom.routeToggle.textContent = min ? '+' : '−';
      dom.routeToggle.setAttribute('aria-expanded', String(!min));
    });

    dom.throttle.addEventListener('input', (e) => {
      ensureAudio();
      setThrottle(e.target.value);
    });
    dom.brakeBtn.addEventListener('click', () => { ensureAudio(); toggleBrake(); });
    dom.emergencyBtn.addEventListener('click', () => { ensureAudio(); applyEmergency(); });
    dom.autoBtn.addEventListener('click', () => { ensureAudio(); setAuto(!state.auto); });
    dom.doorBtn.addEventListener('click', () => { ensureAudio(); toggleDoors(); });
    dom.hornBtn.addEventListener('click', () => {
      ensureAudio();
      if (audio) audio.horn();
      toast('BEEP BEEP · ปี๊บ ปี๊บ', 'gold');
    });
    dom.viewButtons.forEach((b) => b.addEventListener('click', () => setView(Number(b.dataset.view))));
    dom.skipBtn.addEventListener('click', () => {
      ensureAudio();
      if (terminusAhead() && state.speed < 1) reverseDirection();
      else setStation(state.nextIndex);
    });
    dom.stationList.addEventListener('click', (e) => {
      const btn = e.target.closest('.station-item');
      if (!btn) return;
      ensureAudio();
      setStation(Number(btn.dataset.index));
    });

    renderer.domElement.addEventListener('pointerdown', (e) => {
      if (!state.started || (state.view !== 1 && state.view !== 2)) return;
      state.dragging = true;
      state.pointer.x = e.clientX;
      state.pointer.y = e.clientY;
      if (renderer.domElement.setPointerCapture) {
        try { renderer.domElement.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      }
    });
    renderer.domElement.addEventListener('pointermove', (e) => {
      if (!state.dragging) return;
      const dx = e.clientX - state.pointer.x;
      const dy = e.clientY - state.pointer.y;
      state.pointer.x = e.clientX;
      state.pointer.y = e.clientY;
      state.cabYaw = clamp(state.cabYaw - dx * 0.0032, -1.15, 1.15);
      state.cabPitch = clamp(state.cabPitch - dy * 0.0025, -0.42, 0.42);
    });
    const endDrag = () => { state.dragging = false; };
    renderer.domElement.addEventListener('pointerup', endDrag);
    renderer.domElement.addEventListener('pointercancel', endDrag);

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('error', (e) => {
      if (!window.__BTS_ERRORS) window.__BTS_ERRORS = [];
      window.__BTS_ERRORS.push(String(e.message || e.error || 'unknown error'));
    });
    document.addEventListener('pointerdown', () => ensureAudio(), { once: true, passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && audio && audio.ctx && audio.ctx.state === 'running') {
        audio.ctx.suspend();
      } else if (!document.hidden && audio && audio.ctx && audio.ctx.state === 'suspended' && state.started) {
        audio.ctx.resume();
      }
    });
  }

  function onKeyDown(e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || e.code === 'Space') { e.preventDefault(); ensureAudio(); toggleDoors(); return; }
    if (k === 'arrowup' || k === 'w') { e.preventDefault(); ensureAudio(); setThrottle(state.throttle + 5); return; }
    if (k === 'arrowdown' || k === 's') {
      e.preventDefault();
      ensureAudio();
      if (state.auto) setAuto(false, true);
      state.throttle = 0;
      state.brake = true;
      if (dom.throttle) dom.throttle.value = '0';
      updateControlsUI();
      updateHUD(true);
      return;
    }
    if (k === 'e') { ensureAudio(); applyEmergency(); return; }
    if (k === 'a') { ensureAudio(); setAuto(!state.auto); return; }
    if (k === 'd') { ensureAudio(); toggleDoors(); return; }
    if (k === 'h') { ensureAudio(); if (audio) audio.horn(); return; }
    if (k === '1' || k === '2' || k === '3' || k === '4') { setView(Number(k)); return; }
    if (k === 'l') { toggleLanguage(); return; }
    if (k === 'm') { ensureAudio(); toggleMute(); return; }
    if (k === 'f') { toggleFullscreen(); return; }
    if (k === 'k') { ensureAudio(); setRain(!state.rain); return; }
    if (k === 'r') {
      if (terminusAhead() && state.speed < 1) reverseDirection();
      else toast(t('reverseHint'), 'gold');
      return;
    }
    if (k === '?' || (k === '/' && e.shiftKey)) { openHelp(); return; }
    if (k === 'escape') { closeHelp(); return; }
  }

  /* ---------------------------------------------------------------------------
     Self tests
     ------------------------------------------------------------------------ */

  function runSelfTests() {
    const results = [];
    const check = (name, fn) => {
      try {
        const value = fn();
        results.push({ name, ok: !!value, value });
      } catch (err) {
        results.push({ name, ok: false, error: err.message });
      }
    };

    check('Three.js r128 loaded', () => typeof THREE !== 'undefined' && THREE.REVISION === '128');
    check('WebGL renderer created', () => !!renderer && !!renderer.domElement);
    check('Scene populated', () => !!scene && scene.children.length > 30);
    check('47 operational stations', () => STATIONS.length === 47);
    check('Unique station codes', () => new Set(STATIONS.map((s) => s.code)).size === 47);
    check('Terminus codes N24 / E23', () => STATIONS[0].code === 'N24' && STATIONS[46].code === 'E23');
    check('Four city zones', () => new Set(STATIONS.map((s) => s.zone)).size === 4);
    check('Route curve surveyed', () => routeLengthWorld > 1000 && displayTotal > 10000);
    check('47 station positions', () => stationPositions.length === 47 && stationPositions.every((p) => isFinite(p.x) && isFinite(p.z)));
    check('Four-car train', () => cars.length === 4);
    check('Sliding door panels', () => doorPanels.length >= 24);
    check('47 station signal heads', () => stationSignals.filter(Boolean).length === 47);
    check('Procedural city buildings', () => !!buildingMesh && (buildingMesh.count + (lowriseMesh ? lowriseMesh.count : 0)) > 1000);
    check('Glass tower instancing', () => !!glassMesh && glassMesh.count > 20);
    check('Third rail present', () => !!scene.getObjectByName('ThirdRail'));
    check('Victory Monument landmark', () => !!scene.getObjectByName('VictoryMonument'));
    check('Siam skywalk landmark', () => !!scene.getObjectByName('SiamSkywalk'));
    check('Terminal 21 landmark', () => !!scene.getObjectByName('Terminal21'));
    check('Erawan Museum landmark', () => !!scene.getObjectByName('ErawanMuseum'));
    check('47-row station list', () => dom.stationList.children.length === 47);
    check('Minimap canvas context', () => !!minimapCtx);
    check('Web Audio engine', () => !!audio && typeof audio.chime === 'function' && typeof audio.horn === 'function');
    check('Four camera views', () => dom.viewButtons.length === 4);
    check('Rain system ready', () => !!rainRoot && rainRoot.geometry.attributes.position.count === RAIN_COUNT * 2);
    check('Passenger exchange pool', () => dynamicPeds.length >= 24);
    check('Audio mixer methods', () => !!audio && typeof audio.setEngineVolume === 'function' && typeof audio.setMusicVolume === 'function' && typeof audio.setRain === 'function');

    const originalStation = state.currentIndex;
    const originalLang = state.lang;
    setLanguage('th', true);
    check('Thai language switch', () => dom.modeChip.textContent === I18N.th.manual);
    setLanguage('en', true);
    check('English language switch', () => dom.modeChip.textContent === I18N.en.manual);

    setStation(23, { silent: true });
    check('Jump to Siam CEN', () => state.currentIndex === 23 && STATIONS[state.currentIndex].code === 'CEN');
    check('Speed reset on jump', () => state.speed === 0 && state.doorsOpen === false);

    setAuto(true, true);
    check('Auto pilot engages', () => state.auto === true);
    setAuto(false, true);
    check('Auto pilot disengages', () => state.auto === false);

    const opened = openDoors(false);
    check('Doors open at platform', () => opened && state.doorsOpen === true);
    closeDoors(false);
    check('Doors close', () => state.doorsOpen === false);

    setView(4, true);
    check('Platform camera selects', () => state.view === 4);
    setView(1, true);

    check('No uncaught runtime errors', () => !window.__BTS_ERRORS || window.__BTS_ERRORS.length === 0);

    setStation(originalStation, { silent: true });
    setLanguage(originalLang, true);
    setView(1, true);

    const passed = results.filter((r) => r.ok).length;
    const total = results.length;
    const output = 'BTS SUKHUMVIT LINE 3D — SELF TEST\n' +
      passed + '/' + total + ' PASS\n\n' +
      results.map((r) => (r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.error ? ' — ' + r.error : '')).join('\n') +
      '\n\n' + (passed === total ? 'ALL SYSTEMS GO · READY FOR SERVICE' : 'CHECK FAILURES ABOVE');
    dom.selftestOut.hidden = false;
    dom.selftestOut.textContent = output;
    dom.selftestOut.className = 'selftest ' + (passed === total ? 'pass' : 'fail');
    document.body.dataset.selftest = passed === total ? 'pass' : 'fail';
    document.body.dataset.selftestSummary = passed + '/' + total;
    window.__BTS_TEST__ = { passed, total, results };
    console.log(output);
  }

  /* ---------------------------------------------------------------------------
     Main loop
     ------------------------------------------------------------------------ */

  let lastFrame = performance.now();

  function animate(now) {
    const dt = clamp((now - lastFrame) / 1000, 0, 0.05);
    lastFrame = now;
    state.time += dt;

    if (state.started) {
      updateKinematics(dt);
      updateDoors(dt);
      updateAudio(dt);
    } else {
      updateDoors(dt);
    }

    updateTraffic(dt);
    if (state.rain) updateRain(dt);
    updateDynamicPassengers(dt);
    updateTrainTransform();
    updateCameras(dt);
    updateSignalLights();
    updateBillboards(dt);

    if (state.ready) {
      if (state.time - state.lastHud > 0.1) updateHUD(false);
      if (state.time - state.lastMap > 0.22) {
        state.lastMap = state.time;
        updateMinimap();
      }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  /* ---------------------------------------------------------------------------
     Public debug surface + boot
     ------------------------------------------------------------------------ */

  window.__BTS__ = {
    get scene() { return scene; },
    get camera() { return camera; },
    get renderer() { return renderer; },
    get routeCurve() { return routeCurve; },
    state,
    STATIONS,
    ZONES,
    INTERCHANGES,
    cars,
    get audio() { return audio; },
    get dynamicPeds() { return dynamicPeds; },
    get rainRoot() { return rainRoot; },
    setStation,
    setView,
    setAuto,
    setLanguage,
    setTimeOfDay,
    setRain,
    stationAnnouncement,
    openDoors,
    closeDoors,
    toggleDoors,
    updateHUD,
    runSelfTests
  };
  window.__BTS_ERRORS = [];

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
