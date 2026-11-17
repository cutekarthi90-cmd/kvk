// Local Storage Service for QuickBill - KVK Thaniya Mandi

export const STORAGE_KEYS = {
  SHOP: 'quickbill_shop_settings',
  ITEMS: 'quickbill_items',
  CUSTOMERS: 'quickbill_customers',
  SALES: 'quickbill_sales',
  RECEIPTS: 'quickbill_receipts',
  PURCHASES: 'quickbill_purchases',
  SUPPLIERS: 'quickbill_suppliers',
  SUPPLIER_PAYMENTS: 'quickbill_supplier_payments',
  SALES_RETURNS: 'quickbill_sales_returns',
  EXPENSES: 'quickbill_expenses',
  INTEREST_LOANS: 'quickbill_interest_loans',
  INTEREST_PAYMENTS: 'quickbill_interest_payments',
  FINANCIAL_YEAR: 'quickbill_financial_year',
  DELETED_IDS: 'quickbill_deleted_ids',
  LAST_MODIFIED: 'quickbill_last_modified',
};

// Default standard 8-digit HSN codes for agricultural grains of KVK Thaniya Mandi
export const DEFAULT_GRAIN_HSN_MAP = {
  'லைன் மஞ்சள் சோளம்': '10059000',
  'நாடு மஞ்சள் சோளம்': '10059000',
  'அரியலூர் மஞ்சள் சோளம்': '10059000',
  'சின்ன வெள்ளை சோளம்': '10079000',
  'சிகப்பு சோளம்': '10079000',
  'மாஞ்சோளம்': '10059000',
  'தரக்கனாமி சோளம்': '10079000',
  'மானாவாரி சோளம்': '10079000',
  'பீஜாப்பூர் சோளம்': '10079000',
  'மக்காச்சோளம்': '10059000',
  'காரிச்சோளம்': '10079000',
  'கொல்லு': '07139090',
  'கம்பு': '10082990',
  'தட்டைப்பயறு': '07133990',
  'நரிப்பயறு': '07139090',
  'பச்சைப்பயறு': '07133190',
};

export const normalizeTo8DigitHSN = (name, hsn) => {
  const clean = (hsn || '').toString().trim();
  if (clean.length === 8) return clean;
  if (name && DEFAULT_GRAIN_HSN_MAP[name]) return DEFAULT_GRAIN_HSN_MAP[name];
  if (clean === '1005') return '10059000';
  if (clean === '1007') return '10079000';
  if (clean === '1008') return '10082990';
  if (clean === '0713' || clean === '713') return '07139090';
  if (clean.length > 0 && clean.length < 8) return clean.padEnd(8, '0');
  return clean;
};

// Permanent Tamil transliteration map for KVK Mandi customers
export const CUSTOMER_NAME_TAMIL_MAP = {
  'Vembomdampalayam sivalingam': 'வேம்பாண்டாம்பாளையம் சிவலிங்கம்',
  'Nambiyur suppu son prakash': 'நம்பியூர் சுப்பு மகன் பிரகாஷ்',
  'Kunnathur nadarajan': 'குன்னத்தூர் நடராஜன்',
  'Nellaistores velampalayam baskar': 'நெல்லை ஸ்டோர்ஸ் வேலம்பாளையம் பாஸ்கர்',
  'Kolathur karungalur subramani': 'கொளத்தூர் கருங்களூர் சுப்பிரமணி',
  'Karumalaikoodal': 'கருமலைக்கூடல்',
  'Sani santhai arisikadai boopathi': 'சனிசந்தை அரிசிக்கடை பூபதி',
  'Modachur thambikadai': 'மொடச்சூர் தம்பிக்கடை',
  'Veppadai saraswathi stores': 'வெப்படை சரஸ்வதி ஸ்டோர்ஸ்',
  'Kaveri cross': 'காவேரி கிராஸ்',
  'Kanjikovil balu': 'காஞ்சிக்கோவில் பாலு',
  'Vijayamangalam T.C.R': 'விஜயமங்கலம் T.C.R',
  'Pongalur santhi stores': 'பொங்கலூர் சாந்தி ஸ்டோர்ஸ்',
  'Puliyampatti sampath': 'புளியம்பட்டி சம்பத்',
  'Kunnathur krishnan': 'குன்னத்தூர் கிருஷ்ணன்',
  'Koduvaai kannan': 'கொடுவாய் கண்ணன்',
  'Perumanallur manikaarar': 'பெருமாநல்லூர் மணிக்காரர்',
  'Uthukuli R.S Vakkipilkaarar': 'ஊத்துக்குளி R.S வக்கீல்பிள்ளைக்காரர்',
  'Palani Venkatesh': 'பழனி வெங்கடேஷ்',
  'Oothiyur sun': 'ஊதியூர் சன்',
  'Mylambaadi pooranam': 'மைலம்பாடி பூரணம்',
  'Ayyampalayam Chinnathambi': 'அய்யம்பாளையம் சின்னத்தம்பி',
  'Vetrikumar Kolapalur': 'வெற்றிகுமார் கொளப்பலூர்',
  'Kaasiyur Ramesh': 'காசியூர் ரமேஷ்',
  'Sakkaraikaarar': 'சக்கரைக்காரர்',
  'Mecheri Venkatesh': 'மேச்சேரி வெங்கடேஷ்',
  'Veppadai Lakshmi Arisimandi': 'வெப்படை லட்சுமி அரிசி மண்டி',
  'Pallagowndanpalayam Chenniyappan': 'பல்லகவுண்டன்பாளையம் சென்னியப்பன்',
  'Senthamangalam JB': 'செந்தாமங்கலம் JB',
  'Poothapaadi Urakadai': 'பூதப்பாடி உரக்கடை',
  'Kangeyam Amman & co': 'காங்கேயம் அம்மன் & கோ',
  'Bavani Lingesh': 'பவானி லிங்கேஷ்',
  'Kangeyam K.S.A': 'காங்கேயம் K.S.A',
  'Pallagowdanpalayam Ramesh': 'பல்லகவுண்டன்பாளையம் ரமேஷ்',
  'Dharapuram Ganesh': 'தாராபுரம் கணேஷ்',
  'Kangeyam T.M.S': 'காங்கேயம் T.M.S',
  'Ganesapuram Anand': 'கணேசபுரம் ஆனந்த்',
  'Sevur periyasolakaarar': 'சேவூர் பெரியசோளக்காரர்'
};

const DEFAULT_SHOP = {
  name: 'KVK THANIYA MANDI',
  proprietor: '',
  phone: '9486668732 / 9443995160',
  address: 'No.2/1, P.R.S. Road, Mukasipidariyur, CHENNIMALAI, Erode - 638 051',
  gstin: '33BJGPV4768L1ZH',
  pan: 'BJGPV4768L',
  upiId: '',
  terms: 'Thank you for your business! Goods once sold will not be taken back.',
};

// 15 Default Thaniya Mandi items with initial stock (Standard Per Bag = 50kg)
const DEFAULT_ITEMS = [
  {
    "id": "item-1793679298266",
    "name": "லைன் மஞ்சள் சோளம்",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-1793679523692",
    "name": "நாடு மஞ்சள் சோளம்",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-1793679610174",
    "name": "அரியலூர் மஞ்சள் சோளம்",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-1793679670961",
    "name": "சின்ன வெள்ளை சோளம்",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-1793679700075",
    "name": "சிகப்பு சோளம்",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-1793679729784",
    "name": "மாஞ்சோளம்",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-1793679757695",
    "name": "தரக்கனாமி சோளம்",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-1793679794191",
    "name": "மானாவாரி சோளம்",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-1793679817570",
    "name": "பீஜாப்பூர் சோளம்",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-1793679842658",
    "name": "மக்காச்சோளம்",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-1793679862054",
    "name": "காரிச்சோளம்",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-1793679879079",
    "name": "கொல்லு",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-1793679891344",
    "name": "கம்பு",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-1793679924242",
    "name": "தட்டைப்பயறு",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-1793679991224",
    "name": "நரிப்பயறு",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-1793680061589",
    "name": "பச்சைப்பயறு",
    "price": 0,
    "purchasePrice": 0,
    "initialStock": 0,
    "unit": "Bag"
  },
  {
    "id": "item-manjal",
    "name": "MANJAL CHOLAM / மஞ்சள் சோளம்",
    "price": 5000,
    "unit": "Bag",
    "initialStock": 50
  },
  {
    "id": "item-makkacholam",
    "name": "மக்காச்சோளம் (Corn)",
    "price": 2200,
    "unit": "Bag",
    "initialStock": 40
  },
  {
    "id": "item-1",
    "name": "Ponni Boiled Rice (50kg)",
    "price": 2700,
    "unit": "Bag",
    "initialStock": 50
  },
  {
    "id": "item-2",
    "name": "Raw Rice (50kg)",
    "price": 2500,
    "unit": "Bag",
    "initialStock": 40
  },
  {
    "id": "item-3",
    "name": "Kambu - Pearl Millet (50kg)",
    "price": 2100,
    "unit": "Bag",
    "initialStock": 200
  },
  {
    "id": "item-4",
    "name": "Ragi (Finger Millet) (50kg)",
    "price": 2300,
    "unit": "Bag",
    "initialStock": 150
  },
  {
    "id": "item-6",
    "name": "Coriander Seeds (Dhaniya) (50kg)",
    "price": 6500,
    "unit": "Bag",
    "initialStock": 100
  },
  {
    "id": "item-7",
    "name": "Groundnut (Kadalai) (50kg)",
    "price": 6000,
    "unit": "Bag",
    "initialStock": 120
  },
  {
    "id": "item-8",
    "name": "Gingelly Seeds (Ellu) (50kg)",
    "price": 9500,
    "unit": "Bag",
    "initialStock": 80
  },
  {
    "id": "item-9",
    "name": "Toor Dal (50kg)",
    "price": 8250,
    "unit": "Bag",
    "initialStock": 150
  },
  {
    "id": "item-10",
    "name": "Urad Dal (50kg)",
    "price": 7000,
    "unit": "Bag",
    "initialStock": 120
  },
  {
    "id": "item-11",
    "name": "Moong Dal (50kg)",
    "price": 6250,
    "unit": "Bag",
    "initialStock": 100
  },
  {
    "id": "item-12",
    "name": "Horse Gram (Kollu) (50kg)",
    "price": 3250,
    "unit": "Bag",
    "initialStock": 90
  },
  {
    "id": "item-13",
    "name": "Green Gram (Pachai Payaru) (50kg)",
    "price": 5500,
    "unit": "Bag",
    "initialStock": 110
  },
  {
    "id": "item-14",
    "name": "Bengal Gram (Kondakadalai) (50kg)",
    "price": 4750,
    "unit": "Bag",
    "initialStock": 100
  },
  {
    "id": "item-15",
    "name": "Sesame Oil (Tin/Bag)",
    "price": 4350,
    "unit": "Bag",
    "initialStock": 60
  }
];

const DEFAULT_CUSTOMERS = [
  {
    "id": "cust-1793722744596",
    "name": "ஒரிச்சேரிபுத்தூர்",
    "phone": "9442726720",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:19:04.596Z"
  },
  {
    "id": "cust-1793723781200",
    "name": "புளியம்பட்டி முருகேஷ்",
    "phone": "9600722401",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:36:21.200Z"
  },
  {
    "id": "cust-1793723745402",
    "name": "மைலம்பாடி ராஜா",
    "phone": "9790501510",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:35:45.402Z"
  },
  {
    "id": "cust-1793723715910",
    "name": "ஒலகடம் பிரபாகரன்",
    "phone": "9865127336",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:35:15.910Z"
  },
  {
    "id": "cust-1793723663418",
    "name": "மைலம்பாடி மணி",
    "phone": "9952259917",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:34:23.418Z"
  },
  {
    "id": "cust-1793723626070",
    "name": "குன்னத்தூர் திவாகர்",
    "phone": "7397055471",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:33:46.070Z"
  },
  {
    "id": "cust-1793723579741",
    "name": "குன்னத்தூர் கோபால்",
    "phone": "8056416938",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:32:59.741Z"
  },
  {
    "id": "cust-1793723533531",
    "name": "கரடிவாவி ஜெகநாதன்",
    "phone": "9976198345",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:32:13.531Z"
  },
  {
    "id": "cust-1793723496104",
    "name": "பருவாச்சி பூபதி",
    "phone": "9842856900",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:31:36.104Z"
  },
  {
    "id": "cust-1793723457908",
    "name": "குருசாமி",
    "phone": "9842946954",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:30:57.908Z"
  },
  {
    "id": "cust-1793723426619",
    "name": "திருமுருகன் சென்னிமலை",
    "phone": "9865981666",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:30:26.619Z"
  },
  {
    "id": "cust-1793723395694",
    "name": "பூனாட்சி ராசு",
    "phone": "8760406911",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:29:55.694Z"
  },
  {
    "id": "cust-1793723356434",
    "name": "சக்தி ஊஞ்சம்பாளையம்",
    "phone": "9842936688",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:29:16.434Z"
  },
  {
    "id": "cust-1793723299011",
    "name": "வேலு",
    "phone": "9750287546",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:28:19.011Z"
  },
  {
    "id": "cust-1793723275007",
    "name": "M.K.M",
    "phone": "9965752785",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:27:55.007Z"
  },
  {
    "id": "cust-1793723249789",
    "name": "கோதை பூனாட்சி",
    "phone": "9965788172",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:27:29.789Z"
  },
  {
    "id": "cust-1793723209173",
    "name": "குன்னத்தூர் சரவணன்",
    "phone": "8760293003",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:26:49.173Z"
  },
  {
    "id": "cust-1793723185408",
    "name": "S.P.S",
    "phone": "9865719575",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:26:25.408Z"
  },
  {
    "id": "cust-1793723136597",
    "name": "சன் நசியனூர்",
    "phone": "9952857072",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:25:36.597Z"
  },
  {
    "id": "cust-1793723039726",
    "name": "விநாயகா (டோல்கேட்)",
    "phone": "9994969205",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:23:59.726Z"
  },
  {
    "id": "cust-1793726566693",
    "name": "வேம்பாண்டாம்பாளையம் சிவலிங்கம்",
    "phone": "8012672345",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:22:46.693Z"
  },
  {
    "id": "cust-1793726533732",
    "name": "நம்பியூர் சுப்பு மகன் பிரகாஷ்",
    "phone": "9443944632",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:22:13.732Z"
  },
  {
    "id": "cust-1793726478377",
    "name": "குன்னத்தூர் நடராஜன்",
    "phone": "9894987821",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:21:18.377Z"
  },
  {
    "id": "cust-1793726428865",
    "name": "நெல்லை ஸ்டோர்ஸ் வேலம்பாளையம் பாஸ்கர்",
    "phone": "9865693562",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:20:28.865Z"
  },
  {
    "id": "cust-1793726311526",
    "name": "கொளத்தூர் கருங்களூர் சுப்பிரமணி",
    "phone": "9786775476",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:18:31.526Z"
  },
  {
    "id": "cust-1793726278576",
    "name": "கருமலைக்கூடல்",
    "phone": "7200143734",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:17:58.576Z"
  },
  {
    "id": "cust-1793726241269",
    "name": "சனிசந்தை அரிசிக்கடை பூபதி",
    "phone": "9095951091",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:17:21.269Z"
  },
  {
    "id": "cust-1793726202895",
    "name": "மொடச்சூர் தம்பிக்கடை",
    "phone": "9942756317",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:16:42.895Z"
  },
  {
    "id": "cust-1793726168453",
    "name": "வெப்படை சரஸ்வதி ஸ்டோர்ஸ்",
    "phone": "9080286341",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:16:08.453Z"
  },
  {
    "id": "cust-1793726136639",
    "name": "காவேரி கிராஸ்",
    "phone": "8883626565",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:15:36.639Z"
  },
  {
    "id": "cust-1793726072794",
    "name": "காஞ்சிக்கோவில் பாலு",
    "phone": "9952671946",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:14:32.794Z"
  },
  {
    "id": "cust-1793726030940",
    "name": "விஜயமங்கலம் T.C.R",
    "phone": "9443680459",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:13:50.940Z"
  },
  {
    "id": "cust-1793725881799",
    "name": "பொங்கலூர் சாந்தி ஸ்டோர்ஸ்",
    "phone": "9842697600",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:11:21.799Z"
  },
  {
    "id": "cust-1793725849728",
    "name": "புளியம்பட்டி சம்பத்",
    "phone": "9865657764",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:10:49.728Z"
  },
  {
    "id": "cust-1793725780161",
    "name": "குன்னத்தூர் கிருஷ்ணன்",
    "phone": "9842294524",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:09:40.161Z"
  },
  {
    "id": "cust-1793725752455",
    "name": "கொடுவாய் கண்ணன்",
    "phone": "9842562444",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:09:12.455Z"
  },
  {
    "id": "cust-1793725643956",
    "name": "பெருமாநல்லூர் மணிக்காரர்",
    "phone": "9789665518",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:07:23.956Z"
  },
  {
    "id": "cust-1793725508665",
    "name": "வாசு",
    "phone": "9865527777",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:05:08.665Z"
  },
  {
    "id": "cust-1793725455480",
    "name": "A தொப்பபாளையம் கோபி",
    "phone": "9750127912",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:04:15.480Z"
  },
  {
    "id": "cust-1793725316406",
    "name": "கொளத்தூர் கருங்களூர் கோவிந்தசாமி",
    "phone": "9003748480",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:01:56.406Z"
  },
  {
    "id": "cust-1793725271119",
    "name": "கொளத்தூர் சண்முகம்",
    "phone": "9994426822",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:01:11.119Z"
  },
  {
    "id": "cust-1793725206359",
    "name": "பருவாச்சி ஆதர்ஷ் கார்த்தி",
    "phone": "9976915260",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T17:00:06.359Z"
  },
  {
    "id": "cust-1793725018165",
    "name": "பருவாச்சி பெருமாள்",
    "phone": "7094853859",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:56:58.165Z"
  },
  {
    "id": "cust-1793724962321",
    "name": "பெரும்தொழுவு சோளக்கடை",
    "phone": "9095474637",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:56:02.321Z"
  },
  {
    "id": "cust-1793724859383",
    "name": "T.N பாளையம் ஆறுகுட்டி",
    "phone": "9865949879",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:54:19.383Z"
  },
  {
    "id": "cust-1793724814376",
    "name": "சின்னக்கா மேட்டூர்",
    "phone": "9791036095",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:53:34.376Z"
  },
  {
    "id": "cust-1793724762987",
    "name": "கொளத்தூர் பூரணம்",
    "phone": "9500241295",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:52:42.987Z"
  },
  {
    "id": "cust-1793724726258",
    "name": "கொளத்தூர் ராமசாமி (நாகேஷ்)",
    "phone": "9360458057",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:52:06.258Z"
  },
  {
    "id": "cust-1793724691034",
    "name": "நாமக்கல் சுந்தரம்",
    "phone": "9842229403",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:51:31.034Z"
  },
  {
    "id": "cust-1793724657869",
    "name": "P.P செல்வம்",
    "phone": "9790660683",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:50:57.869Z"
  },
  {
    "id": "cust-1793724610557",
    "name": "கொளத்தூர் சரவணன்",
    "phone": "9486936705",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:50:10.557Z"
  },
  {
    "id": "cust-1793724569114",
    "name": "கொளத்தூர் பாப்பாதி",
    "phone": "9789416232",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:49:29.114Z"
  },
  {
    "id": "cust-1793724523601",
    "name": "கொளத்தூர் சத்யநகர் அலமேலு",
    "phone": "9597738385",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:48:43.601Z"
  },
  {
    "id": "cust-1793724400368",
    "name": "கொளத்தூர் கண்ணன்",
    "phone": "9790525181",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:46:40.368Z"
  },
  {
    "id": "cust-1793724366999",
    "name": "நெருப்பூர் ராமகொண்டல்லி சீனிவாசன்",
    "phone": "9159262051",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:46:06.999Z"
  },
  {
    "id": "cust-1793724295158",
    "name": "பூனாட்சி காந்தி",
    "phone": "9629499040",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:44:55.158Z"
  },
  {
    "id": "cust-1793724233914",
    "name": "K.R ரேவதி",
    "phone": "9385860201",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:43:53.914Z"
  },
  {
    "id": "cust-1793724183527",
    "name": "அந்தியூர் ஜோதி",
    "phone": "9524835721",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:43:03.527Z"
  },
  {
    "id": "cust-1793724139840",
    "name": "கின்னிபாளையம் துறை",
    "phone": "9865915924",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:42:19.840Z"
  },
  {
    "id": "cust-1793724075549",
    "name": "சென்னம்பட்டி ராதா",
    "phone": "7502041506",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:41:15.549Z"
  },
  {
    "id": "cust-1793724049267",
    "name": "கொளத்தூர் சௌந்தர்ராஜன்",
    "phone": "9524784595",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-03T16:40:49.267Z"
  },
  {
    "id": "cust-1793808973743",
    "name": "ஊத்துக்குளி R.S வக்கீல்பிள்ளைக்காரர்",
    "phone": "8015542943",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:16:13.743Z"
  },
  {
    "id": "cust-1793808925984",
    "name": "பழனி வெங்கடேஷ்",
    "phone": "9994064001",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:15:25.984Z"
  },
  {
    "id": "cust-1793808873917",
    "name": "ஊதியூர் சன்",
    "phone": "9659549100",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:14:33.917Z"
  },
  {
    "id": "cust-1793808800931",
    "name": "மைலம்பாடி பூரணம்",
    "phone": "9865636303",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:13:20.931Z"
  },
  {
    "id": "cust-1793808776171",
    "name": "அய்யம்பாளையம் சின்னத்தம்பி",
    "phone": "9865220207",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:12:56.171Z"
  },
  {
    "id": "cust-1793808742936",
    "name": "வெற்றிகுமார் கொளப்பலூர்",
    "phone": "9443852888",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:12:22.936Z"
  },
  {
    "id": "cust-1793808715289",
    "name": "காசியூர் ரமேஷ்",
    "phone": "9443064143",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:11:55.289Z"
  },
  {
    "id": "cust-1793808679947",
    "name": "சக்கரைக்காரர்",
    "phone": "9965454990",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:11:19.947Z"
  },
  {
    "id": "cust-1793808645147",
    "name": "மேச்சேரி வெங்கடேஷ்",
    "phone": "9442995025",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:10:45.147Z"
  },
  {
    "id": "cust-1793808619398",
    "name": "வெப்படை லட்சுமி அரிசி மண்டி",
    "phone": "9942111322",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:10:19.398Z"
  },
  {
    "id": "cust-1793808397579",
    "name": "பல்லகவுண்டன்பாளையம் சென்னியப்பன்",
    "phone": "9944172427",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:06:37.579Z"
  },
  {
    "id": "cust-1793808368914",
    "name": "செந்தாமங்கலம் JB",
    "phone": "9442645149",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:06:08.914Z"
  },
  {
    "id": "cust-1793808323584",
    "name": "பூதப்பாடி உரக்கடை",
    "phone": "9750143004",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:05:23.584Z"
  },
  {
    "id": "cust-1793808271643",
    "name": "காங்கேயம் அம்மன் & கோ",
    "phone": "9894439185",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:04:31.643Z"
  },
  {
    "id": "cust-1793808242446",
    "name": "பவானி லிங்கேஷ்",
    "phone": "9944371204",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:04:02.446Z"
  },
  {
    "id": "cust-1793808180877",
    "name": "காங்கேயம் K.S.A",
    "phone": "9443220396",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:03:00.877Z"
  },
  {
    "id": "cust-1793808146488",
    "name": "பல்லகவுண்டன்பாளையம் ரமேஷ்",
    "phone": "9952821935",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:02:26.488Z"
  },
  {
    "id": "cust-1793808106423",
    "name": "தாராபுரம் கணேஷ்",
    "phone": "9442351927",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:01:46.423Z"
  },
  {
    "id": "cust-1793808078004",
    "name": "காங்கேயம் T.M.S",
    "phone": "9025984830",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:01:18.004Z"
  },
  {
    "id": "cust-1793808037133",
    "name": "கணேசபுரம் ஆனந்த்",
    "phone": "7010949003",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T16:00:37.133Z"
  },
  {
    "id": "cust-1793807990573",
    "name": "சேவூர் பெரியசோளக்காரர்",
    "phone": "9791530525",
    "address": "",
    "notes": "",
    "openingBalance": 0,
    "openingBalanceType": "DEBIT",
    "createdAt": "2026-11-04T15:59:50.573Z"
  }
];

/**
 * Get Financial Year based on date (Indian FY: April 1 to March 31)
 * E.g. "2026-05-20" -> "2026-2027", "2027-02-15" -> "2026-2027"
 */
export const getFinancialYear = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '2026-2027';
  const month = d.getMonth() + 1; // 1 to 12
  const year = d.getFullYear();
  if (month >= 4) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
};

export const Storage = {
  // --- TOMBSTONES & VERSION TRACKING (Prevents resurrected items on sync) ---
  unblockProtectedItems: () => {
    // Preserves intentional deletions - do not unblock
  },

  getDeletedIds: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  recordDeletedId: (id) => {
    if (!id) return;
    try {
      const current = Storage.getDeletedIds();
      if (!current.includes(id)) {
        current.push(id);
        localStorage.setItem(STORAGE_KEYS.DELETED_IDS, JSON.stringify(current));
      }
      Storage.touchModified();
    } catch (e) {
      console.warn('Error recording deleted id:', e);
    }
  },

  isDeleted: (id) => {
    return Storage.getDeletedIds().includes(id);
  },

  touchModified: () => {
    localStorage.setItem(STORAGE_KEYS.LAST_MODIFIED, Date.now().toString());
  },

  getLastModified: () => {
    return Number(localStorage.getItem(STORAGE_KEYS.LAST_MODIFIED)) || 0;
  },

  // --- SHOP SETTINGS ---
  getShopSettings: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHOP);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.name && parsed.name !== 'SRI MURUGAN TRADERS') {
          return parsed;
        }
      }
      Storage.saveShopSettings(DEFAULT_SHOP);
      return DEFAULT_SHOP;
    } catch {
      return DEFAULT_SHOP;
    }
  },
  saveShopSettings: (settings) => {
    localStorage.setItem(STORAGE_KEYS.SHOP, JSON.stringify(settings));
    Storage.touchModified();
  },

  // --- ITEMS & STOCK MASTER ---
  getItems: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ITEMS);
      const deleted = Storage.getDeletedIds();
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((item) => item && !deleted.includes(item.id))
            .map((item) => ({
              ...item,
              unit: item.unit || 'Bag',
              hsn: normalizeTo8DigitHSN(item.name, item.hsn || item.hsnCode),
            }));
        }
      }
      return DEFAULT_ITEMS
        .filter((item) => item && !deleted.includes(item.id))
        .map((item) => ({
          ...item,
          unit: item.unit || 'Bag',
          hsn: normalizeTo8DigitHSN(item.name, item.hsn || item.hsnCode),
        }));
    } catch {
      return DEFAULT_ITEMS;
    }
  },
  saveItems: (items) => {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    Storage.touchModified();
  },

  // --- CUSTOMERS ---
  getCustomers: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      const deleted = Storage.getDeletedIds();
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let hasChange = false;
          const cleaned = parsed.map((c) => {
            if (CUSTOMER_NAME_TAMIL_MAP[c.name]) {
              hasChange = true;
              return { ...c, name: CUSTOMER_NAME_TAMIL_MAP[c.name] };
            }
            return c;
          });
          if (hasChange) {
            localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(cleaned));
          }
          return cleaned.filter((c) => !deleted.includes(c.id));
        }
      }
      Storage.saveCustomers(DEFAULT_CUSTOMERS);
      return DEFAULT_CUSTOMERS;
    } catch {
      return DEFAULT_CUSTOMERS;
    }
  },
  saveCustomers: (customers) => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    Storage.touchModified();
  },

  // --- SALES & FINANCIAL YEAR NUMBERING ---
  getSales: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALES);
      const list = data ? JSON.parse(data) : [];
      const deleted = Storage.getDeletedIds();
      return list.filter((s) => !deleted.includes(s.id));
    } catch {
      return [];
    }
  },
  saveSales: (sales) => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    Storage.touchModified();
  },

  /**
   * Auto-increment Bill No per Financial Year!
   * - Regular GST Bills: 1, 2, 3... (strictly sequential for tax compliance)
   * - Q Sales (Quotation): Q-1, Q-2, Q-3... (separate sequence, excluded from GST)
   * Restarts at 1 when FY changes (e.g. 01/04/2027)!
   */
  getNextInvoiceNo: (sales = [], targetDate = null, isQSale = false) => {
    const fy = getFinancialYear(targetDate || new Date().toISOString().split('T')[0]);
    if (isQSale) {
      const qSales = (sales || []).filter(
        (s) => getFinancialYear(s.date) === fy && (s.isQSale || s.billType === 'Q_SALE')
      );
      const maxNo = qSales.reduce((max, s) => {
        const clean = String(s.invoiceNo || '').replace(/[^0-9]/g, '');
        const num = parseInt(clean, 10) || 0;
        return Math.max(max, num);
      }, 0);
      return maxNo + 1;
    } else {
      // Regular Billing Series: starts at KVK 1 per user request
      const regularSales = (sales || []).filter(
        (s) => getFinancialYear(s.date) === fy && !s.isQSale && s.billType !== 'Q_SALE'
      );
      const kvkSales = regularSales.filter((s) => String(s.invoiceNo || '').toUpperCase().includes('KVK'));
      if (kvkSales.length === 0) {
        return 1; // First bill starts as KVK 1!
      }
      const maxNo = kvkSales.reduce((max, s) => {
        const match = String(s.invoiceNo || '').match(/\d+/);
        const num = match ? parseInt(match[0], 10) : 0;
        return Math.max(max, num);
      }, 0);
      return maxNo + 1;
    }
  },

  // --- RECEIPTS (Customer Payments) ---
  getReceipts: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
      const list = data ? JSON.parse(data) : [];
      const deleted = Storage.getDeletedIds();
      return list.filter((r) => !deleted.includes(r.id));
    } catch {
      return [];
    }
  },
  saveReceipts: (receipts) => {
    localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(receipts));
    Storage.touchModified();
  },

  // --- PURCHASES (Regular GST & Q-Purchases) ---
  getPurchases: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PURCHASES);
      const list = data ? JSON.parse(data) : [];
      const deleted = Storage.getDeletedIds();
      return list.filter((p) => !deleted.includes(p.id));
    } catch {
      return [];
    }
  },
  savePurchases: (purchases) => {
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
    Storage.touchModified();
  },

  // --- SUPPLIERS & SUPPLIER PAYMENTS ---
  getSuppliers: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
      const deleted = Storage.getDeletedIds();
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.filter((s) => !deleted.includes(s.id));
      }
      return [
        { id: 'sup-1', name: 'Raju Agro Pollachi', phone: '9842112345' },
        { id: 'sup-2', name: 'Murugan Grains Kangayam', phone: '9443354321' },
      ];
    } catch {
      return [];
    }
  },
  saveSuppliers: (suppliers) => {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
    Storage.touchModified();
  },

  getSupplierPayments: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUPPLIER_PAYMENTS);
      const list = data ? JSON.parse(data) : [];
      const deleted = Storage.getDeletedIds();
      return list.filter((p) => !deleted.includes(p.id));
    } catch {
      return [];
    }
  },
  saveSupplierPayments: (payments) => {
    localStorage.setItem(STORAGE_KEYS.SUPPLIER_PAYMENTS, JSON.stringify(payments));
    Storage.touchModified();
  },

  // --- GODOWNS (குடோன்கள்) ---
  getDeletedGodowns: () => {
    try {
      const data = localStorage.getItem('quickbill_deleted_godowns');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  recordDeletedGodown: (godownName) => {
    try {
      const name = (godownName || '').trim();
      if (!name) return;
      const current = Storage.getDeletedGodowns();
      if (!current.includes(name)) {
        current.push(name);
        localStorage.setItem('quickbill_deleted_godowns', JSON.stringify(current));
      }
      // Also remove from saved godowns
      const data = localStorage.getItem('quickbill_godowns');
      const list = data ? JSON.parse(data) : [];
      const filtered = (Array.isArray(list) ? list : []).filter((g) => (g || '').trim() !== name);
      localStorage.setItem('quickbill_godowns', JSON.stringify(filtered));
      Storage.touchModified();
    } catch {}
  },
  unrecordDeletedGodown: (godownName) => {
    try {
      const name = (godownName || '').trim();
      if (!name) return;
      const current = Storage.getDeletedGodowns().filter((g) => g.trim() !== name);
      localStorage.setItem('quickbill_deleted_godowns', JSON.stringify(current));
      Storage.touchModified();
    } catch {}
  },
  getGodowns: () => {
    try {
      const deleted = Storage.getDeletedGodowns();
      const data = localStorage.getItem('quickbill_godowns');
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.filter((g) => !deleted.includes((g || '').trim()));
        }
      }
      // Fallback only if never saved
      const purchases = Storage.getPurchases();
      const fromPurchases = (purchases || []).map((p) => (p?.godown || '').trim()).filter(Boolean);
      return Array.from(new Set(fromPurchases)).filter((g) => !deleted.includes(g.trim()));
    } catch {
      return [];
    }
  },
  saveGodowns: (godowns) => {
    const cleanList = Array.from(new Set((godowns || []).map((g) => (g || '').trim()).filter(Boolean)));
    localStorage.setItem('quickbill_godowns', JSON.stringify(cleanList));
    Storage.touchModified();
  },

  // --- SALES RETURNS (விற்பனை திருப்பம்) ---
  getSalesReturns: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALES_RETURNS);
      const list = data ? JSON.parse(data) : [];
      const deleted = Storage.getDeletedIds();
      return list.filter((item) => !deleted.includes(item.id));
    } catch {
      return [];
    }
  },
  saveSalesReturns: (returns) => {
    localStorage.setItem(STORAGE_KEYS.SALES_RETURNS, JSON.stringify(returns));
    Storage.touchModified();
  },

  // --- EXPENSES TRACKER (டீசல் & கூலி - Diesel, Kooli) ---
  getExpenses: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      const list = data ? JSON.parse(data) : [];
      const deleted = Storage.getDeletedIds();
      return list.filter((e) => !deleted.includes(e.id));
    } catch {
      return [];
    }
  },
  saveExpenses: (expenses) => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    Storage.touchModified();
  },

  // --- INTEREST LOANS TRACKER (வட்டி கணக்கு) ---
  getInterestLoans: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INTEREST_LOANS);
      const list = data ? JSON.parse(data) : [];
      const deleted = Storage.getDeletedIds();
      return list.filter((l) => !deleted.includes(l.id));
    } catch {
      return [];
    }
  },
  saveInterestLoans: (loans) => {
    localStorage.setItem(STORAGE_KEYS.INTEREST_LOANS, JSON.stringify(loans));
    Storage.touchModified();
  },

  getInterestPayments: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INTEREST_PAYMENTS);
      const list = data ? JSON.parse(data) : [];
      const deleted = Storage.getDeletedIds();
      return list.filter((p) => !deleted.includes(p.id));
    } catch {
      return [];
    }
  },
  saveInterestPayments: (payments) => {
    localStorage.setItem(STORAGE_KEYS.INTEREST_PAYMENTS, JSON.stringify(payments));
    Storage.touchModified();
  },

  // --- FINANCIAL CALCULATIONS & LEDGERS ---

  // Calculate supplier balance: Opening Balance + Total Purchases - Immediate Paid - Later Payments - Discounts
  getSupplierBalance: (supplierName) => {
    if (!supplierName) return { openingBalance: 0, totalPurchases: 0, totalPaid: 0, totalDiscount: 0, netDue: 0 };
    const sName = supplierName.trim().toLowerCase();
    const supObj = (Storage.getSuppliers() || []).find(
      (s) => (s.name || '').trim().toLowerCase() === sName
    );
    const opBal = Number(supObj?.openingBalance) || 0;

    const purchases = Storage.getPurchases().filter(
      (p) => (p.supplierName || '').trim().toLowerCase() === sName
    );
    const payments = Storage.getSupplierPayments().filter(
      (p) => (p.supplierName || '').trim().toLowerCase() === sName
    );

    const totalPurchases = purchases.reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);
    const totalPurchaseDiscount = purchases.reduce((sum, p) => sum + (Number(p.discount) || 0), 0);
    const immediatePaid = purchases.reduce(
      (sum, p) => sum + (p.paymentStatus === 'PAID' ? Number(p.grandTotal) || 0 : (Number(p.paidAmount) || 0)),
      0
    );
    const laterPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const laterDiscount = payments.reduce((sum, p) => sum + (Number(p.discount) || 0), 0);

    const totalPaid = immediatePaid + laterPaid;
    const totalDiscount = totalPurchaseDiscount + laterDiscount;
    const netDue = Math.max(0, opBal + totalPurchases - totalPaid - laterDiscount);

    return {
      openingBalance: opBal,
      totalPurchases,
      totalPaid,
      totalDiscount,
      netDue,
    };
  },

  // Calculate live item stock:
  // RULE (as requested by user):
  // - Purchase & Q-Purchase both ADD to physical stock (+Stock)
  // - Sales Returns ADD back to stock (+Stock)
  // - Q-Sales strictly DEDUCTS from physical stock (-Stock)
  // - Original GST Sales do NOT deduct physical stock (since user bills official separate from Mandi godown physical stock)
  getItemStock: (itemId) => {
    const items = Storage.getItems();
    const item = items.find((i) => i.id === itemId);
    if (!item) return 0;

    const initial = Number(item.initialStock) || 0;
    const purchases = Storage.getPurchases();
    const sales = Storage.getSales();
    const returns = Storage.getSalesReturns();

    let purchasedQty = 0;
    purchases.forEach((p) => {
      (p.items || []).forEach((pi) => {
        if (pi.id === itemId) {
          purchasedQty += Number(pi.qty) || 0;
        }
      });
    });

    let returnedQty = 0;
    returns.forEach((r) => {
      (r.items || []).forEach((ri) => {
        if (ri.id === itemId) {
          returnedQty += Number(ri.qty) || 0;
        }
      });
    });

    let soldQty = 0;
    sales.forEach((s) => {
      // ONLY Q-Sales reduce physical stock!
      const isQ = s.isQSale || s.billType === 'Q_SALE';
      if (isQ) {
        (s.items || []).forEach((si) => {
          if (si.id === itemId) {
            soldQty += Number(si.qty) || 0;
          }
        });
      }
    });

    return initial + purchasedQty + returnedQty - soldQty;
  },

  // Calculate official GST Stock for an item (Original Bill Stock)
  getOriginalBillItemStock: (itemId) => {
    const items = Storage.getItems();
    const item = items.find((i) => i.id === itemId);
    if (!item) return 0;

    const initial = Number(item.gstOpeningStock !== undefined ? item.gstOpeningStock : item.initialStock) || 0;
    const purchases = Storage.getPurchases();
    const sales = Storage.getSales();

    let gstPurchasedQty = 0;
    purchases.forEach((p) => {
      const isQ = p.isQPurchase || p.billType === 'Q_PURCHASE';
      if (!isQ) {
        (p.items || []).forEach((pi) => {
          if (pi.id === itemId) {
            gstPurchasedQty += Number(pi.qty) || 0;
          }
        });
      }
    });

    let gstSoldQty = 0;
    sales.forEach((s) => {
      const isQ = s.isQSale || s.billType === 'Q_SALE';
      if (!isQ) {
        (s.items || []).forEach((si) => {
          if (si.id === itemId) {
            gstSoldQty += Number(si.qty) || 0;
          }
        });
      }
    });

    return initial + gstPurchasedQty - gstSoldQty;
  },

  // Calculate customer balance including Opening Balance & Sales Returns (can filter by type: 'ALL' | 'REGULAR' | 'Q_SALE')
  getCustomerBalance: (customerId, type = 'ALL', optSales = null, optReceipts = null, optReturns = null, optCust = null) => {
    const cust = optCust || Storage.getCustomers().find((c) => c && c.id === customerId);
    const rawOpBal = Number(cust?.openingBalance) || 0;
    const opType = cust?.openingBalanceType || 'DEBIT';
    // For Q-Sale separate view, opening balance is typically attached to regular account unless specified
    const opBal = (type === 'Q_SALE') ? 0 : rawOpBal;

    let sales = (optSales || Storage.getSales() || []).filter((s) => s && s.customerId === customerId);
    let receipts = (optReceipts || Storage.getReceipts() || []).filter((r) => r && r.customerId === customerId);
    let returns = (optReturns || Storage.getSalesReturns() || []).filter((r) => r && r.customerId === customerId);

    if (type === 'REGULAR') {
      sales = sales.filter((s) => !s.isQSale && s.billType !== 'Q_SALE');
      receipts = receipts.filter((r) => !r.isQSale && r.billType !== 'Q_SALE');
      returns = returns.filter((r) => !r.isQSale && r.billType !== 'Q_SALE');
    } else if (type === 'Q_SALE') {
      sales = sales.filter((s) => s.isQSale || s.billType === 'Q_SALE');
      receipts = receipts.filter((r) => r.isQSale || r.billType === 'Q_SALE');
      returns = returns.filter((r) => r.isQSale || r.billType === 'Q_SALE');
    }

    const totalSales = sales.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
    const totalReceipts = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const immediatePaid = sales.reduce((sum, s) => sum + (Number(s.paidAmount) || 0), 0);
    const totalReturns = returns.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

    const totalCredits = totalReceipts + immediatePaid + totalReturns;

    let netDue = 0;
    if (opType === 'CREDIT') {
      netDue = totalSales - totalCredits - opBal;
    } else {
      netDue = opBal + totalSales - totalCredits;
    }

    return {
      openingBalance: opBal,
      openingBalanceType: opType,
      totalSales,
      totalPaid: totalReceipts + immediatePaid,
      totalReturns,
      netDue: Math.max(0, netDue),
    };
  },

  // Full customer ledger transactions sorted by date ascending with Opening Balance & Returns
  getCustomerLedger: (customerId, type = 'ALL', optSales = null, optReceipts = null, optReturns = null, optCust = null) => {
    const cust = optCust || Storage.getCustomers().find((c) => c && c.id === customerId);
    const rawOpBal = Number(cust?.openingBalance) || 0;
    const opType = cust?.openingBalanceType || 'DEBIT';
    const opBal = (type === 'Q_SALE') ? 0 : rawOpBal;

    let sales = (optSales || Storage.getSales() || []).filter((s) => s && s.customerId === customerId);
    let receipts = (optReceipts || Storage.getReceipts() || []).filter((r) => r && r.customerId === customerId);
    let returns = (optReturns || Storage.getSalesReturns() || []).filter((r) => r && r.customerId === customerId);

    if (type === 'REGULAR') {
      sales = sales.filter((s) => !s.isQSale && s.billType !== 'Q_SALE');
      receipts = receipts.filter((r) => !r.isQSale && r.billType !== 'Q_SALE');
      returns = returns.filter((r) => !r.isQSale && r.billType !== 'Q_SALE');
    } else if (type === 'Q_SALE') {
      sales = sales.filter((s) => s.isQSale || s.billType === 'Q_SALE');
      receipts = receipts.filter((r) => r.isQSale || r.billType === 'Q_SALE');
      returns = returns.filter((r) => r.isQSale || r.billType === 'Q_SALE');
    }

    const transactions = [];

    // 1. Opening Balance Transaction (shown in ALL or REGULAR)
    if (opBal > 0) {
      const opDate = cust?.createdAt ? cust.createdAt.split('T')[0] : '2026-01-01';
      transactions.push({
        id: `cust-${customerId}-opbal`,
        date: opDate,
        createdAt: cust?.createdAt || '2026-01-01',
        type: 'OPENING',
        refNo: 'OP-BAL',
        description: 'Opening Balance (பழைய பாக்கி)',
        debit: opType === 'DEBIT' ? opBal : 0,
        credit: opType === 'CREDIT' ? opBal : 0,
      });
    }

    sales.forEach((s) => {
      const isQ = s.isQSale || s.billType === 'Q_SALE';
      const sItems = Array.isArray(s.items) ? s.items : [];
      transactions.push({
        id: s.id,
        date: s.date,
        createdAt: s.createdAt || s.date,
        type: isQ ? 'Q_SALE' : 'SALE',
        refNo: String(s.invoiceNo || '1'),
        description: `${isQ ? '📦 Q-Sale' : 'Sale'}: ${sItems.length} items (${sItems.map((i) => i.name).slice(0, 2).join(', ')}${sItems.length > 2 ? '...' : ''})`,
        debit: Number(s.grandTotal) || 0,
        credit: 0,
        paidAmount: Number(s.paidAmount) || 0,
        items: sItems,
        raw: s,
        isQSale: isQ,
      });

      if (Number(s.paidAmount) > 0) {
        transactions.push({
          id: `${s.id}-paid`,
          date: s.date,
          createdAt: s.createdAt || s.date,
          type: 'PAYMENT',
          refNo: String(s.invoiceNo || '1'),
          description: `Cash received for Bill #${s.invoiceNo}`,
          debit: 0,
          credit: Number(s.paidAmount) || 0,
        });
      }
    });

    receipts.forEach((r) => {
      transactions.push({
        id: r.id,
        date: r.date,
        createdAt: r.createdAt || r.date,
        type: 'RECEIPT',
        refNo: String(r.receiptNo || '1'),
        description: `Receipt: ${r.paymentMode || 'Cash'} ${r.notes ? `(${r.notes})` : ''}`,
        debit: 0,
        credit: Number(r.amount) || 0,
        paymentMode: r.paymentMode,
        raw: r,
      });
    });

    returns.forEach((ret) => {
      const retItems = Array.isArray(ret.items) ? ret.items : [];
      transactions.push({
        id: ret.id,
        date: ret.date,
        createdAt: ret.createdAt || ret.date,
        type: 'RETURN',
        refNo: `SR-${ret.returnNo || '1'}`,
        description: `Sales Return (விற்பனை திருப்பம்): ${retItems.length} items (${ret.reason || 'Goods Return'})`,
        debit: 0,
        credit: Number(ret.totalAmount) || 0,
        items: retItems,
        raw: ret,
      });
    });

    // Sort by date ascending (keep opening balance first if same date)
    transactions.sort((a, b) => {
      if (a.type === 'OPENING') return -1;
      if (b.type === 'OPENING') return 1;
      return new Date(a.date) - new Date(b.date);
    });

    // Calculate running balance
    let running = 0;
    return transactions.map((t) => {
      running = running + t.debit - t.credit;
      return {
        ...t,
        balance: running,
      };
    });
  },

  // --- SAFE MULTI-DEVICE SYNC MERGE ---
  // Guarantees phone's active data is never wiped by an ephemeral waking server!
  mergeSafeServerData: (serverData) => {
    if (!serverData) return null;
    if (Array.isArray(serverData.deletedIds)) {
      serverData.deletedIds.forEach((id) => Storage.recordDeletedId(id));
    }
    if (Array.isArray(serverData.deletedGodowns)) {
      serverData.deletedGodowns.forEach((g) => Storage.recordDeletedGodown(g));
    }
    const deleted = Storage.getDeletedIds();
    const deletedGodowns = Storage.getDeletedGodowns();

    const mergeById = (localList, serverList) => {
      const map = new Map();
      // Put all local items first (sanitize any known English names to Tamil)
      (localList || []).forEach((item) => {
        if (item && item.id && !deleted.includes(item.id)) {
          const fixedName = item.name ? (CUSTOMER_NAME_TAMIL_MAP[item.name] || item.name) : undefined;
          map.set(item.id, fixedName ? { ...item, name: fixedName } : item);
        }
      });
      // Server updates take precedence for matching items, preserving any local-only offline items
      (serverList || []).forEach((item) => {
        if (item && item.id && !deleted.includes(item.id)) {
          const existing = map.get(item.id);
          const fixedName = item.name ? (CUSTOMER_NAME_TAMIL_MAP[item.name] || item.name) : undefined;
          const cleanServerItem = fixedName ? { ...item, name: fixedName } : item;
          if (existing) {
            map.set(item.id, { ...existing, ...cleanServerItem });
          } else {
            map.set(item.id, cleanServerItem);
          }
        }
      });
      return Array.from(map.values());
    };

    // Merge items: respect deleted IDs, merge local edits with server items
    const mergedItems = (() => {
      if (Array.isArray(serverData.deletedIds)) {
        serverData.deletedIds.forEach((id) => Storage.recordDeletedId(id));
      }
      const deleted = Storage.getDeletedIds();
      const itemMap = new Map();

      // Start with local items (ignoring deleted)
      (Storage.getItems() || []).forEach((i) => {
        if (i && i.id && !deleted.includes(i.id)) {
          itemMap.set(i.id, {
            ...i,
            unit: i.unit || 'Bag',
            hsn: normalizeTo8DigitHSN(i.name, i.hsn || i.hsnCode),
          });
        }
      });

      // Overlay server items (ignoring deleted)
      (serverData.items || []).forEach((i) => {
        if (i && i.id && !deleted.includes(i.id)) {
          const existing = itemMap.get(i.id);
          const rawHsn = i.hsn || i.hsnCode || (existing && (existing.hsn || existing.hsnCode));
          const finalHsn = normalizeTo8DigitHSN(i.name, rawHsn);
          itemMap.set(i.id, existing ? { ...existing, ...i, unit: i.unit || existing.unit || 'Bag', hsn: finalHsn } : { ...i, unit: i.unit || 'Bag', hsn: finalHsn });
        }
      });

      // Strip any deleted godowns from item.godownInitialStock across all items
      itemMap.forEach((item, id) => {
        if (item && item.godownInitialStock && typeof item.godownInitialStock === 'object') {
          let changed = false;
          const cleanStock = { ...item.godownInitialStock };
          deletedGodowns.forEach((dg) => {
            if (cleanStock[dg] !== undefined) {
              delete cleanStock[dg];
              changed = true;
            }
          });
          if (changed) {
            const newTotal = Object.values(cleanStock).reduce((s, v) => s + (Number(v) || 0), 0);
            itemMap.set(id, { ...item, godownInitialStock: cleanStock, initialStock: newTotal });
          }
        }
      });

      const res = Array.from(itemMap.values());
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(res));
      return res;
    })();

    const cleanGodowns = (Array.isArray(serverData.godowns) ? serverData.godowns : Storage.getGodowns()).filter((g) => !deletedGodowns.includes((g || '').trim()));

    return {
      shop: serverData.shop || Storage.getShopSettings(),
      items: mergedItems,
      customers: mergeById(Storage.getCustomers(), serverData.customers),
      sales: mergeById(Storage.getSales(), serverData.sales).sort((a, b) => {
        const numA = parseInt(String(a.invoiceNo || '').replace(/[^0-9]/g, ''), 10) || 0;
        const numB = parseInt(String(b.invoiceNo || '').replace(/[^0-9]/g, ''), 10) || 0;
        if (numB !== numA) return numB - numA;
        return new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0);
      }),
      receipts: mergeById(Storage.getReceipts(), serverData.receipts).sort((a, b) => {
        return new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0);
      }),
      purchases: mergeById(Storage.getPurchases(), serverData.purchases).sort((a, b) => {
        return new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0);
      }),
      suppliers: mergeById(Storage.getSuppliers(), serverData.suppliers),
      supplierPayments: mergeById(Storage.getSupplierPayments(), serverData.supplierPayments),
      salesReturns: mergeById(Storage.getSalesReturns(), serverData.salesReturns),
      expenses: mergeById(Storage.getExpenses(), serverData.expenses),
      interestLoans: mergeById(Storage.getInterestLoans(), serverData.interestLoans),
      interestPayments: mergeById(Storage.getInterestPayments(), serverData.interestPayments),
      godowns: cleanGodowns,
    };
  },

  exportBackupData: () => {
    return JSON.stringify({
      shop: Storage.getShopSettings(),
      items: Storage.getItems(),
      customers: Storage.getCustomers(),
      sales: Storage.getSales(),
      receipts: Storage.getReceipts(),
      purchases: Storage.getPurchases(),
      suppliers: Storage.getSuppliers(),
      supplierPayments: Storage.getSupplierPayments(),
      salesReturns: Storage.getSalesReturns(),
      expenses: Storage.getExpenses(),
      interestLoans: Storage.getInterestLoans(),
      interestPayments: Storage.getInterestPayments(),
      deletedIds: Storage.getDeletedIds(),
      exportDate: new Date().toISOString(),
      version: '3.0',
    }, null, 2);
  },

  restoreBackupData: (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.shop) Storage.saveShopSettings(data.shop);
      if (Array.isArray(data.items)) Storage.saveItems(data.items);
      if (Array.isArray(data.customers)) Storage.saveCustomers(data.customers);
      if (Array.isArray(data.sales)) Storage.saveSales(data.sales);
      if (Array.isArray(data.receipts)) Storage.saveReceipts(data.receipts);
      if (Array.isArray(data.purchases)) Storage.savePurchases(data.purchases);
      if (Array.isArray(data.suppliers)) Storage.saveSuppliers(data.suppliers);
      if (Array.isArray(data.supplierPayments)) Storage.saveSupplierPayments(data.supplierPayments);
      if (Array.isArray(data.salesReturns)) Storage.saveSalesReturns(data.salesReturns);
      if (Array.isArray(data.expenses)) Storage.saveExpenses(data.expenses);
      if (Array.isArray(data.interestLoans)) Storage.saveInterestLoans(data.interestLoans);
      if (Array.isArray(data.interestPayments)) Storage.saveInterestPayments(data.interestPayments);
      return true;
    } catch (e) {
      console.error('Failed to restore backup', e);
      return false;
    }
  },

  resetToDefault: () => {
    Storage.saveShopSettings(DEFAULT_SHOP);
    Storage.saveItems(DEFAULT_ITEMS);
    Storage.saveCustomers(DEFAULT_CUSTOMERS);
    Storage.saveSales([]);
    Storage.saveReceipts([]);
    Storage.savePurchases([]);
    Storage.saveSuppliers([]);
    Storage.saveSupplierPayments([]);
    Storage.saveSalesReturns([]);
    Storage.saveExpenses([]);
    Storage.saveInterestLoans([]);
    Storage.saveInterestPayments([]);
  },
};
