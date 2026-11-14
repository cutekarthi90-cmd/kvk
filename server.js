import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// High performance GZIP compression for mobile phones
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DIST_DIR = path.join(__dirname, 'dist');

// Unique build version timestamp for instant client auto-updates
const BUILD_VERSION = Date.now().toString();

const CUSTOMER_NAME_TAMIL_MAP = {
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

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default database structure for KVK THANIYA MANDI
const DEFAULT_DB = {
  "shop": {
    "name": "KVK THANIYA MANDI",
    "proprietor": "",
    "phone": "9486668732 / 9443995160",
    "address": "No.2/1, P.R.S. Road, Mukasipidariyur, CHENNIMALAI, Erode - 638 051",
    "gstin": "33BJGPV4768L1ZH",
    "pan": "BJGPV4768L",
    "upiId": "",
    "terms": "Thank you for your business! Goods once sold will not be taken back."
  },
  "items": [
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
  ],
  "customers": [
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
      "name": "Vembomdampalayam sivalingam",
      "phone": "8012672345",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:22:46.693Z"
    },
    {
      "id": "cust-1793726533732",
      "name": "Nambiyur suppu son prakash",
      "phone": "9443944632",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:22:13.732Z"
    },
    {
      "id": "cust-1793726478377",
      "name": "Kunnathur nadarajan",
      "phone": "9894987821",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:21:18.377Z"
    },
    {
      "id": "cust-1793726428865",
      "name": "Nellaistores velampalayam baskar",
      "phone": "9865693562",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:20:28.865Z"
    },
    {
      "id": "cust-1793726311526",
      "name": "Kolathur karungalur subramani",
      "phone": "9786775476",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:18:31.526Z"
    },
    {
      "id": "cust-1793726278576",
      "name": "Karumalaikoodal",
      "phone": "7200143734",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:17:58.576Z"
    },
    {
      "id": "cust-1793726241269",
      "name": "Sani santhai arisikadai boopathi",
      "phone": "9095951091",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:17:21.269Z"
    },
    {
      "id": "cust-1793726202895",
      "name": "Modachur thambikadai",
      "phone": "9942756317",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:16:42.895Z"
    },
    {
      "id": "cust-1793726168453",
      "name": "Veppadai saraswathi stores",
      "phone": "9080286341",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:16:08.453Z"
    },
    {
      "id": "cust-1793726136639",
      "name": "Kaveri cross",
      "phone": "8883626565",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:15:36.639Z"
    },
    {
      "id": "cust-1793726072794",
      "name": "Kanjikovil balu",
      "phone": "9952671946",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:14:32.794Z"
    },
    {
      "id": "cust-1793726030940",
      "name": "Vijayamangalam T.C.R",
      "phone": "9443680459",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:13:50.940Z"
    },
    {
      "id": "cust-1793725881799",
      "name": "Pongalur santhi stores",
      "phone": "9842697600",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:11:21.799Z"
    },
    {
      "id": "cust-1793725849728",
      "name": "Puliyampatti sampath",
      "phone": "9865657764",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:10:49.728Z"
    },
    {
      "id": "cust-1793725780161",
      "name": "Kunnathur krishnan",
      "phone": "9842294524",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:09:40.161Z"
    },
    {
      "id": "cust-1793725752455",
      "name": "Koduvaai kannan",
      "phone": "9842562444",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-03T17:09:12.455Z"
    },
    {
      "id": "cust-1793725643956",
      "name": "Perumanallur manikaarar",
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
      "name": "Uthukuli R.S Vakkipilkaarar",
      "phone": "8015542943",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:16:13.743Z"
    },
    {
      "id": "cust-1793808925984",
      "name": "Palani Venkatesh",
      "phone": "9994064001",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:15:25.984Z"
    },
    {
      "id": "cust-1793808873917",
      "name": "Oothiyur sun",
      "phone": "9659549100",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:14:33.917Z"
    },
    {
      "id": "cust-1793808800931",
      "name": "Mylambaadi pooranam",
      "phone": "9865636303",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:13:20.931Z"
    },
    {
      "id": "cust-1793808776171",
      "name": "Ayyampalayam Chinnathambi",
      "phone": "9865220207",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:12:56.171Z"
    },
    {
      "id": "cust-1793808742936",
      "name": "Vetrikumar Kolapalur",
      "phone": "9443852888",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:12:22.936Z"
    },
    {
      "id": "cust-1793808715289",
      "name": "Kaasiyur Ramesh",
      "phone": "9443064143",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:11:55.289Z"
    },
    {
      "id": "cust-1793808679947",
      "name": "Sakkaraikaarar",
      "phone": "9965454990",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:11:19.947Z"
    },
    {
      "id": "cust-1793808645147",
      "name": "Mecheri Venkatesh",
      "phone": "9442995025",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:10:45.147Z"
    },
    {
      "id": "cust-1793808619398",
      "name": "Veppadai Lakshmi Arisimandi",
      "phone": "9942111322",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:10:19.398Z"
    },
    {
      "id": "cust-1793808397579",
      "name": "Pallagowndanpalayam Chenniyappan",
      "phone": "9944172427",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:06:37.579Z"
    },
    {
      "id": "cust-1793808368914",
      "name": "Senthamangalam JB",
      "phone": "9442645149",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:06:08.914Z"
    },
    {
      "id": "cust-1793808323584",
      "name": "Poothapaadi Urakadai",
      "phone": "9750143004",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:05:23.584Z"
    },
    {
      "id": "cust-1793808271643",
      "name": "Kangeyam Amman & co",
      "phone": "9894439185",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:04:31.643Z"
    },
    {
      "id": "cust-1793808242446",
      "name": "Bavani Lingesh",
      "phone": "9944371204",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:04:02.446Z"
    },
    {
      "id": "cust-1793808180877",
      "name": "Kangeyam K.S.A",
      "phone": "9443220396",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:03:00.877Z"
    },
    {
      "id": "cust-1793808146488",
      "name": "Pallagowdanpalayam Ramesh",
      "phone": "9952821935",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:02:26.488Z"
    },
    {
      "id": "cust-1793808106423",
      "name": "Dharapuram Ganesh",
      "phone": "9442351927",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:01:46.423Z"
    },
    {
      "id": "cust-1793808078004",
      "name": "Kangeyam T.M.S",
      "phone": "9025984830",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:01:18.004Z"
    },
    {
      "id": "cust-1793808037133",
      "name": "Ganesapuram Anand",
      "phone": "7010949003",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T16:00:37.133Z"
    },
    {
      "id": "cust-1793807990573",
      "name": "Sevur periyasolakaarar",
      "phone": "9791530525",
      "address": "",
      "notes": "",
      "openingBalance": 0,
      "openingBalanceType": "DEBIT",
      "createdAt": "2026-11-04T15:59:50.573Z"
    }
  ],
  "sales": [
    {
      "id": "sale-1793176600000",
      "invoiceNo": "2",
      "date": "2026-10-28",
      "createdAt": "2026-10-28T14:00:00.000Z",
      "customerId": "cust-karthik",
      "customerName": "Karthik",
      "customerPhone": "9715422499",
      "items": [
        {
          "id": "item-manjal",
          "name": "MANJAL CHOLAM",
          "qty": 12,
          "price": 5000,
          "unit": "Bag"
        }
      ],
      "subTotal": 60000,
      "discount": 0,
      "grandTotal": 60000,
      "paymentStatus": "CREDIT",
      "paidAmount": 0,
      "paymentMode": ""
    },
    {
      "id": "sale-1793262534128",
      "invoiceNo": "1",
      "date": "2026-10-29",
      "createdAt": "2026-10-29T08:28:54.128Z",
      "customerId": "cust-karthik",
      "customerName": "Karthik",
      "customerPhone": "9715422499",
      "items": [
        {
          "id": "item-manjal",
          "name": "MANJAL CHOLAM / மஞ்சள் சோளம்",
          "price": 5000,
          "unit": "Bag",
          "initialStock": 50,
          "qty": 1
        }
      ],
      "subTotal": 5000,
      "discount": 0,
      "grandTotal": 5000,
      "paymentStatus": "CREDIT",
      "paidAmount": 0,
      "paymentMode": ""
    }
  ],
  "receipts": [],
  "purchases": [
    {
      "id": "pur-1793882542135",
      "billNo": "1",
      "date": "2026-11-05",
      "supplierName": "Kavi",
      "supplierPhone": "9994308732",
      "isQPurchase": false,
      "billType": "GST_BILL",
      "items": [
        {
          "id": "item-1793679700075",
          "name": "சிகப்பு சோளம்",
          "price": 1000,
          "purchasePrice": 0,
          "initialStock": 0,
          "unit": "Bag",
          "qty": 1
        }
      ],
      "subTotal": 1000,
      "freightCharges": 0,
      "discount": 0,
      "grandTotal": 1000,
      "paymentStatus": "PAID",
      "notes": "",
      "createdAt": "2026-11-05T12:42:22.135Z"
    }
  ],
  "lastUpdated": "2026-11-05T12:42:22.716Z",
  "suppliers": [
    {
      "id": "sup-1793803586539",
      "name": "Karthik",
      "phone": "9715422499"
    },
    {
      "id": "sup-1",
      "name": "Raju Agro Pollachi",
      "phone": "9842112345"
    },
    {
      "id": "sup-2",
      "name": "Murugan Grains Kangayam",
      "phone": "9443354321"
    }
  ],
  "supplierPayments": [],
  "salesReturns": [
    {
      "id": "ret-1793293802908",
      "returnNo": 1,
      "date": "2026-10-29",
      "customerId": "cust-karthik",
      "customerName": "Karthik",
      "customerPhone": "9715422499",
      "items": [
        {
          "id": "item-manjal",
          "name": "MANJAL CHOLAM / மஞ்சள் சோளம்",
          "price": 5000,
          "unit": "Bag",
          "initialStock": 50,
          "qty": 1
        }
      ],
      "totalAmount": 5000,
      "reason": "Other / இதர காரணம்",
      "notes": "",
      "createdAt": "2026-10-29T17:10:02.908Z"
    }
  ],
  "expenses": [
    {
      "id": "exp-1793775787661",
      "date": "2026-11-04",
      "category": "rent",
      "amount": 15000,
      "paidTo": "கம்பிளியம்பட்டி குடோன்",
      "paymentMode": "Cash",
      "notes": "3 மாத வாடகை",
      "createdAt": "2026-11-04T07:03:07.661Z"
    }
  ],
  "interestLoans": [],
  "interestPayments": [],
  "godowns": []
};

const readDB = () => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
      return DEFAULT_DB;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.deletedIds)) {
      parsed.deletedIds = [];
    }
    if (!Array.isArray(parsed.godowns)) {
      const fromPurchases = (parsed.purchases || []).map((p) => (p?.godown || '').trim()).filter(Boolean);
      parsed.godowns = Array.from(new Set(fromPurchases));
    }
    if (Array.isArray(parsed.items)) {
      const delSet = new Set(parsed.deletedIds || []);
      parsed.items = parsed.items.filter((item) => item && !delSet.has(item.id));
    } else {
      parsed.items = DEFAULT_DB.items;
    }
    return parsed;
  } catch (err) {
    console.error('Error reading db:', err);
    return DEFAULT_DB;
  }
};

const writeDB = (data) => {
  try {
    data.lastUpdated = new Date().toISOString() + '_' + Math.random().toString(36).slice(2, 7);
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing db:', err);
  }
};

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Safe helper to merge collections by ID so client never wipes server data
const mergeCollectionsById = (serverList = [], clientList = [], deletedIds = []) => {
  const delSet = new Set(deletedIds || []);
  const map = new Map();
  (serverList || []).forEach((item) => {
    if (item && item.id && !delSet.has(item.id)) map.set(item.id, item);
  });
  (clientList || []).forEach((item) => {
    if (item && item.id && !delSet.has(item.id)) {
      const existing = map.get(item.id);
      map.set(item.id, existing ? { ...existing, ...item } : item);
    }
  });
  return Array.from(map.values());
};

// Active Keep-Alive to prevent Render proxy from dropping idle mobile WebSockets
const HEARTBEAT_INTERVAL_MS = 12000;
setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.isAlive === false) {
      console.log('Terminating dead client WebSocket');
      return client.terminate();
    }
    client.isAlive = false;
    try {
      client.ping();
    } catch {}
  });
}, HEARTBEAT_INTERVAL_MS);

// Broadcast helper: sends message to all connected phones
const broadcast = (message, senderWs = null) => {
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== senderWs) {
      client.send(payload);
    }
  });
};

const recordDeletedId = (db, id) => {
  if (!id) return;
  if (!Array.isArray(db.deletedIds)) db.deletedIds = [];
  if (!db.deletedIds.includes(id)) db.deletedIds.push(id);
};

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  const currentData = readDB();
  ws.send(JSON.stringify({ 
    type: 'INIT_STATE', 
    data: currentData, 
    buildVersion: BUILD_VERSION,
    lastUpdated: currentData.lastUpdated || new Date().toISOString()
  }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'PING') {
        ws.isAlive = true;
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        return;
      }

      if (msg.type === 'SYNC_ACTION') {
        const db = readDB();
        const { action, payload } = msg;

        if (action === 'SAVE_SALE') {
          db.sales = [payload, ...(db.sales || []).filter((s) => s.id !== payload.id)];
        } else if (action === 'DELETE_SALE') {
          recordDeletedId(db, payload);
          db.sales = (db.sales || []).filter((s) => s.id !== payload);
        } else if (action === 'SAVE_RECEIPT') {
          db.receipts = [payload, ...(db.receipts || []).filter((r) => r.id !== payload.id)];
        } else if (action === 'DELETE_RECEIPT') {
          recordDeletedId(db, payload);
          db.receipts = (db.receipts || []).filter((r) => r.id !== payload);
        } else if (action === 'SAVE_CUSTOMER') {
          const idx = (db.customers || []).findIndex((c) => c.id === payload.id);
          if (idx >= 0) {
            db.customers[idx] = payload;
          } else {
            db.customers = [payload, ...(db.customers || [])];
          }
        } else if (action === 'DELETE_CUSTOMER') {
          recordDeletedId(db, payload);
          db.customers = (db.customers || []).filter((c) => c.id !== payload);
        } else if (action === 'DELETE_ITEM') {
          recordDeletedId(db, payload);
          db.items = (db.items || []).filter((i) => i.id !== payload);
        } else if (action === 'SAVE_ITEMS') {
          if (!Array.isArray(db.deletedIds)) db.deletedIds = [];
          const delSet = new Set(db.deletedIds);
          db.items = (payload || []).filter((i) => !delSet.has(i.id));
        } else if (action === 'SAVE_SHOP') {
          db.shop = payload;
        } else if (action === 'SAVE_PURCHASE') {
          db.purchases = [payload, ...(db.purchases || []).filter((p) => p.id !== payload.id)];
        } else if (action === 'DELETE_PURCHASE') {
          recordDeletedId(db, payload);
          db.purchases = (db.purchases || []).filter((p) => p.id !== payload);
        } else if (action === 'SAVE_SUPPLIERS') {
          db.suppliers = payload;
        } else if (action === 'SAVE_SUPPLIER_PAYMENTS') {
          db.supplierPayments = payload;
        } else if (action === 'ADD_SUPPLIER_PAYMENT') {
          db.supplierPayments = [payload, ...(db.supplierPayments || []).filter((p) => p.id !== payload.id)];
        } else if (action === 'DELETE_SUPPLIER_PAYMENT') {
          recordDeletedId(db, payload);
          db.supplierPayments = (db.supplierPayments || []).filter((p) => p.id !== payload);
        } else if (action === 'SAVE_SALES_RETURN') {
          db.salesReturns = [payload, ...(db.salesReturns || []).filter((r) => r.id !== payload.id)];
        } else if (action === 'DELETE_SALES_RETURN') {
          recordDeletedId(db, payload);
          db.salesReturns = (db.salesReturns || []).filter((r) => r.id !== payload);
        } else if (action === 'SAVE_EXPENSE') {
          db.expenses = [payload, ...(db.expenses || []).filter((e) => e.id !== payload.id)];
        } else if (action === 'DELETE_EXPENSE') {
          recordDeletedId(db, payload);
          db.expenses = (db.expenses || []).filter((e) => e.id !== payload);
        } else if (action === 'SAVE_INTEREST_LOAN') {
          db.interestLoans = [payload, ...(db.interestLoans || []).filter((l) => l.id !== payload.id)];
        } else if (action === 'DELETE_INTEREST_LOAN') {
          recordDeletedId(db, payload);
          db.interestLoans = (db.interestLoans || []).filter((l) => l.id !== payload);
        } else if (action === 'SAVE_INTEREST_PAYMENT') {
          db.interestPayments = [payload, ...(db.interestPayments || []).filter((p) => p.id !== payload.id)];
        } else if (action === 'DELETE_INTEREST_PAYMENT') {
          recordDeletedId(db, payload);
          db.interestPayments = (db.interestPayments || []).filter((p) => p.id !== payload);
        } else if (action === 'SAVE_GODOWNS') {
          db.godowns = Array.isArray(payload) ? payload : [];
        } else if (action === 'CLIENT_SYNC_STATE') {
          try {
            const clientData = typeof payload === 'string' ? JSON.parse(payload) : payload;
            if (clientData) {
              if (Array.isArray(clientData.deletedIds)) {
                if (!Array.isArray(db.deletedIds)) db.deletedIds = [];
                clientData.deletedIds.forEach((id) => {
                  if (!db.deletedIds.includes(id)) db.deletedIds.push(id);
                });
              }
              if (Array.isArray(clientData.customers)) {
                db.customers = mergeCollectionsById(db.customers, clientData.customers.map((c) => ({
                  ...c,
                  name: CUSTOMER_NAME_TAMIL_MAP[c.name] || c.name,
                })), db.deletedIds);
              }
              if (Array.isArray(clientData.items)) db.items = mergeCollectionsById(db.items, clientData.items, db.deletedIds);
              if (Array.isArray(clientData.sales)) db.sales = mergeCollectionsById(db.sales, clientData.sales, db.deletedIds);
              if (Array.isArray(clientData.purchases)) db.purchases = mergeCollectionsById(db.purchases, clientData.purchases, db.deletedIds);
              if (Array.isArray(clientData.receipts)) db.receipts = mergeCollectionsById(db.receipts, clientData.receipts, db.deletedIds);
              if (Array.isArray(clientData.suppliers)) db.suppliers = mergeCollectionsById(db.suppliers, clientData.suppliers, db.deletedIds);
              if (Array.isArray(clientData.supplierPayments)) db.supplierPayments = mergeCollectionsById(db.supplierPayments, clientData.supplierPayments, db.deletedIds);
              if (Array.isArray(clientData.salesReturns)) db.salesReturns = mergeCollectionsById(db.salesReturns, clientData.salesReturns, db.deletedIds);
              if (Array.isArray(clientData.expenses)) db.expenses = mergeCollectionsById(db.expenses, clientData.expenses, db.deletedIds);
              if (Array.isArray(clientData.interestLoans)) db.interestLoans = mergeCollectionsById(db.interestLoans, clientData.interestLoans, db.deletedIds);
              if (Array.isArray(clientData.interestPayments)) db.interestPayments = mergeCollectionsById(db.interestPayments, clientData.interestPayments, db.deletedIds);
              if (Array.isArray(clientData.godowns)) db.godowns = clientData.godowns;
            }
          } catch (e) {
            console.error('Error syncing client state:', e);
          }
        }

        writeDB(db);

        // Instantly notify ALL other phones connected!
        broadcast({ type: 'LIVE_UPDATE', action, payload, fullData: db }, ws);
        ws.send(JSON.stringify({ type: 'ACTION_ACK', action, success: true }));
      }
    } catch (err) {
      console.error('Error handling ws message:', err);
    }
  });
});

// REST Endpoints
app.get('/api/state', (req, res) => {
  res.json(readDB());
});

app.post('/api/action', (req, res) => {
  const { action, payload } = req.body;
  const db = readDB();

  if (action === 'SAVE_SALE') {
    db.sales = [payload, ...(db.sales || []).filter((s) => s.id !== payload.id)];
  } else if (action === 'DELETE_SALE') {
    recordDeletedId(db, payload);
    db.sales = (db.sales || []).filter((s) => s.id !== payload);
  } else if (action === 'SAVE_RECEIPT') {
    db.receipts = [payload, ...(db.receipts || []).filter((r) => r.id !== payload.id)];
  } else if (action === 'DELETE_RECEIPT') {
    recordDeletedId(db, payload);
    db.receipts = (db.receipts || []).filter((r) => r.id !== payload);
  } else if (action === 'SAVE_CUSTOMER') {
    const idx = (db.customers || []).findIndex((c) => c.id === payload.id);
    if (idx >= 0) {
      db.customers[idx] = payload;
    } else {
      db.customers = [payload, ...(db.customers || [])];
    }
  } else if (action === 'DELETE_CUSTOMER') {
    recordDeletedId(db, payload);
    db.customers = (db.customers || []).filter((c) => c.id !== payload);
  } else if (action === 'DELETE_ITEM') {
    recordDeletedId(db, payload);
    db.items = (db.items || []).filter((i) => i.id !== payload);
  } else if (action === 'SAVE_ITEMS') {
    if (!Array.isArray(db.deletedIds)) db.deletedIds = [];
    const delSet = new Set(db.deletedIds);
    db.items = (payload || []).filter((i) => !delSet.has(i.id));
  } else if (action === 'SAVE_SHOP') {
    db.shop = payload;
  } else if (action === 'SAVE_PURCHASE') {
    db.purchases = [payload, ...(db.purchases || []).filter((p) => p.id !== payload.id)];
  } else if (action === 'DELETE_PURCHASE') {
    recordDeletedId(db, payload);
    db.purchases = (db.purchases || []).filter((p) => p.id !== payload);
  } else if (action === 'SAVE_SUPPLIERS') {
    db.suppliers = payload;
  } else if (action === 'SAVE_SUPPLIER_PAYMENTS') {
    db.supplierPayments = payload;
  } else if (action === 'ADD_SUPPLIER_PAYMENT') {
    db.supplierPayments = [payload, ...(db.supplierPayments || []).filter((p) => p.id !== payload.id)];
  } else if (action === 'DELETE_SUPPLIER_PAYMENT') {
    recordDeletedId(db, payload);
    db.supplierPayments = (db.supplierPayments || []).filter((p) => p.id !== payload);
  } else if (action === 'SAVE_SALES_RETURN') {
    db.salesReturns = [payload, ...(db.salesReturns || []).filter((r) => r.id !== payload.id)];
  } else if (action === 'DELETE_SALES_RETURN') {
    recordDeletedId(db, payload);
    db.salesReturns = (db.salesReturns || []).filter((r) => r.id !== payload);
  } else if (action === 'SAVE_EXPENSE') {
    db.expenses = [payload, ...(db.expenses || []).filter((e) => e.id !== payload.id)];
  } else if (action === 'DELETE_EXPENSE') {
    recordDeletedId(db, payload);
    db.expenses = (db.expenses || []).filter((e) => e.id !== payload);
  } else if (action === 'SAVE_INTEREST_LOAN') {
    db.interestLoans = [payload, ...(db.interestLoans || []).filter((l) => l.id !== payload.id)];
  } else if (action === 'DELETE_INTEREST_LOAN') {
    recordDeletedId(db, payload);
    db.interestLoans = (db.interestLoans || []).filter((l) => l.id !== payload);
  } else if (action === 'SAVE_INTEREST_PAYMENT') {
    db.interestPayments = [payload, ...(db.interestPayments || []).filter((p) => p.id !== payload.id)];
  } else if (action === 'DELETE_INTEREST_PAYMENT') {
    recordDeletedId(db, payload);
    db.interestPayments = (db.interestPayments || []).filter((p) => p.id !== payload);
  } else if (action === 'SAVE_GODOWNS') {
    db.godowns = Array.isArray(payload) ? payload : [];
  } else if (action === 'DELETE_SUPPLIER_PAYMENT') {
    recordDeletedId(db, payload);
    db.supplierPayments = (db.supplierPayments || []).filter((p) => p.id !== payload);
  } else if (action === 'CLIENT_SYNC_STATE') {
    try {
      const clientData = typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (clientData) {
        if (Array.isArray(clientData.deletedIds)) {
          if (!Array.isArray(db.deletedIds)) db.deletedIds = [];
          clientData.deletedIds.forEach((id) => {
            if (!db.deletedIds.includes(id)) db.deletedIds.push(id);
          });
        }
        if (Array.isArray(clientData.customers)) {
          db.customers = mergeCollectionsById(db.customers, clientData.customers.map((c) => ({
            ...c,
            name: CUSTOMER_NAME_TAMIL_MAP[c.name] || c.name,
          })), db.deletedIds);
        }
        if (Array.isArray(clientData.items)) db.items = mergeCollectionsById(db.items, clientData.items, db.deletedIds);
        if (Array.isArray(clientData.sales)) db.sales = mergeCollectionsById(db.sales, clientData.sales, db.deletedIds);
        if (Array.isArray(clientData.purchases)) db.purchases = mergeCollectionsById(db.purchases, clientData.purchases, db.deletedIds);
        if (Array.isArray(clientData.receipts)) db.receipts = mergeCollectionsById(db.receipts, clientData.receipts, db.deletedIds);
        if (Array.isArray(clientData.suppliers)) db.suppliers = mergeCollectionsById(db.suppliers, clientData.suppliers, db.deletedIds);
        if (Array.isArray(clientData.supplierPayments)) db.supplierPayments = mergeCollectionsById(db.supplierPayments, clientData.supplierPayments, db.deletedIds);
        if (Array.isArray(clientData.salesReturns)) db.salesReturns = mergeCollectionsById(db.salesReturns, clientData.salesReturns, db.deletedIds);
        if (Array.isArray(clientData.expenses)) db.expenses = mergeCollectionsById(db.expenses, clientData.expenses, db.deletedIds);
        if (Array.isArray(clientData.interestLoans)) db.interestLoans = mergeCollectionsById(db.interestLoans, clientData.interestLoans, db.deletedIds);
        if (Array.isArray(clientData.interestPayments)) db.interestPayments = mergeCollectionsById(db.interestPayments, clientData.interestPayments, db.deletedIds);
        if (Array.isArray(clientData.godowns)) db.godowns = clientData.godowns;
      }
    } catch (e) {
      console.error('Error syncing client state:', e);
    }
  }

  writeDB(db);
  broadcast({ type: 'LIVE_UPDATE', action, payload, fullData: db });
  res.json({ success: true, db });
});

// Version check endpoint for phones to detect new releases instantly
app.get('/api/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({ version: BUILD_VERSION });
});

// Serve the lightning-fast production bundle directly to phones!
if (fs.existsSync(DIST_DIR)) {
  // 1. Assets with hash in filename (e.g. /assets/index-CaLUr09n.css) can be safely cached
  app.use('/assets', express.static(path.join(DIST_DIR, 'assets'), {
    maxAge: '1y',
    immutable: true,
  }));

  // 2. index.html, sw.js, and manifest.json MUST NEVER BE CACHED so phones always get new versions!
  app.use(express.static(DIST_DIR, {
    maxAge: 0,
    etag: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
      }
    },
  }));

  // 3. Fallback for SPA routing in Express 5 (Strictly NO-CACHE for index.html)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  KVK THANIYA MANDI - Lightning Fast Production Server`);
  console.log(`  Phone & PC URL: http://192.168.1.23:${PORT}`);
  console.log(`  Local PC URL:   http://localhost:${PORT}`);
  console.log(`====================================================`);

  // Auto-ping to prevent Render sleep during active usage
  const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://kvk-1.onrender.com';
  if (renderUrl.startsWith('https')) {
    setInterval(() => {
      fetch(`${renderUrl}/api/state`).catch(() => {});
    }, 12 * 60 * 1000); // Ping every 12 mins
  }
});
