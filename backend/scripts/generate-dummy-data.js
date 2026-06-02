/**
 * generate-dummy-data.js
 * Creates interlinked dummy XLSX files for testing all 3 upload types:
 *   1. Student/Trainee upload
 *   2. Employment upload
 *   3. TOT upload
 *
 * Partners: Gram Vikas Society, Don Bosco Tech Society, Sri Sri Rural Development Trust
 * Batches spread across: January, February, April (2025)
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// ─── OUTPUT FOLDER ──────────────────────────────────────────────────────────
const OUT = path.join(__dirname, '../../documents/dummy-test-data');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// ─── PARTNER & CENTER DATA ──────────────────────────────────────────────────
const PARTNERS = [
  {
    name: 'Gram Vikas Society',
    login: 'sachin.alatagi@outlook.com',
    centers: [
      {
        id: '049e7125-51f6-454c-bbf6-1f0d76110dbf',
        code: 'GRA-136',
        name: 'Govt ITI Bhalki',
        month: 'JAN',
      },
      {
        id: '072ac566-2294-40d7-acf1-0ccab410de4d',
        code: 'GRA-120',
        name: 'GOVT ITI KALWAKURTHY',
        month: 'FEB',
      },
      {
        id: '0881c380-6d3a-434a-beea-5bd731ecdc12',
        code: 'GRA-139',
        name: 'Govt ITI Belagavi Men',
        month: 'APR',
      },
    ],
  },
  {
    name: 'Don Bosco Tech Society',
    login: 'veeresh.modi@dbtech.co.in',
    centers: [
      {
        id: '004039d9-e25a-4a2e-aa57-12c93366c9d7',
        code: 'DON-002',
        name: 'Don Bosco Bishna',
        month: 'FEB',
      },
      {
        id: '00862ee5-76e9-40e9-b575-291dd4330909',
        code: 'DON-026',
        name: 'Don Bosco Bastar',
        month: 'JAN',
      },
      {
        id: '0136a230-9c58-405d-a414-0bde9b2b6cad',
        code: 'DON-044',
        name: 'Don Bosco Ganjam',
        month: 'APR',
      },
    ],
  },
  {
    name: 'Sri Sri Rural Development Trust',
    login: 'tapasya.puri@ssrdp.org',
    centers: [
      {
        id: '037f153d-4d09-466c-895e-c7e3823e8f84',
        code: 'SRI-018',
        name: 'SSRDPT Guwahati Jail',
        month: 'APR',
      },
      {
        id: '04c9ebbe-9113-4290-8f5d-92653a9349cb',
        code: 'SRI-076',
        name: 'Govt ITI Barielly',
        month: 'JAN',
      },
      {
        id: '08af3beb-1dfd-474c-abe2-b1675eb9fc51',
        code: 'SRI-046',
        name: 'Govt ITI Kathua',
        month: 'FEB',
      },
    ],
  },
];

// ─── BATCH DATE RANGES ───────────────────────────────────────────────────────
const BATCH_DATES = {
  JAN: { start: '15-01-2025', end: '14-04-2025', batchSuffix: 'JAN25' },
  FEB: { start: '10-02-2025', end: '09-05-2025', batchSuffix: 'FEB25' },
  APR: { start: '07-04-2025', end: '06-07-2025', batchSuffix: 'APR25' },
};

// ─── DUMMY STUDENT POOLS ─────────────────────────────────────────────────────
// 15 unique names — 5 per center, interlinked with employment data
// partner_student_id is computed as: first3(name)+first3(father)+YYYYMMDD+first4(course)
const STUDENT_POOLS = {
  'Gram Vikas Society': [
    // Bhalki (JAN) - Basic Electronics
    {
      name: 'Arjun Sharma',
      father: 'Ramesh Sharma',
      dob: '15-03-1998',
      gender: 'Male',
      mobile: '9845001001',
      email: 'arjun.sharma@gmail.com',
      qual: 'Class X',
      course: 'Basic Electrician',
      addr: '12 MG Road',
      city: 'Bidar',
      dist: 'Bidar',
      state: 'Karnataka',
    },
    {
      name: 'Sunita Patil',
      father: 'Mahesh Patil',
      dob: '22-07-1999',
      gender: 'Female',
      mobile: '9845001002',
      email: 'sunita.patil@gmail.com',
      qual: 'Class XII',
      course: 'Basic Electrician',
      addr: '34 Station Rd',
      city: 'Bhalki',
      dist: 'Bidar',
      state: 'Karnataka',
    },
    {
      name: 'Kiran Naik',
      father: 'Suresh Naik',
      dob: '05-11-2000',
      gender: 'Male',
      mobile: '9845001003',
      email: 'kiran.naik@gmail.com',
      qual: 'Class X',
      course: 'Basic Electrician',
      addr: '56 Temple St',
      city: 'Bhalki',
      dist: 'Bidar',
      state: 'Karnataka',
    },
    {
      name: 'Kavya Reddy',
      father: 'Prakash Reddy',
      dob: '18-01-1997',
      gender: 'Female',
      mobile: '9845001004',
      email: 'kavya.reddy@gmail.com',
      qual: 'Class XII',
      course: 'Basic Electrician',
      addr: '78 Lake View',
      city: 'Bidar',
      dist: 'Bidar',
      state: 'Karnataka',
    },
    {
      name: 'Ravi Kumar',
      father: 'Dinesh Kumar',
      dob: '30-09-1996',
      gender: 'Male',
      mobile: '9845001005',
      email: 'ravi.kumar@gmail.com',
      qual: 'Diploma',
      course: 'Basic Electrician',
      addr: '90 Civil Rd',
      city: 'Bhalki',
      dist: 'Bidar',
      state: 'Karnataka',
    },
    // KALWAKURTHY (FEB) - Computer Basics
    {
      name: 'Meera Lakshmi',
      father: 'Venkat Lakshmi',
      dob: '12-04-2001',
      gender: 'Female',
      mobile: '9845002001',
      email: 'meera.l@gmail.com',
      qual: 'Class X',
      course: 'Data Center Management',
      addr: '5 Nehru Nagar',
      city: 'Kalwakurthy',
      dist: 'Nalgonda',
      state: 'Telangana',
    },
    {
      name: 'Suresh Yadav',
      father: 'Ramesh Yadav',
      dob: '25-08-1999',
      gender: 'Male',
      mobile: '9845002002',
      email: 'suresh.yadav@gmail.com',
      qual: 'Class XII',
      course: 'Data Center Management',
      addr: '15 Gandhi Rd',
      city: 'Kalwakurthy',
      dist: 'Nalgonda',
      state: 'Telangana',
    },
    {
      name: 'Anita Devi',
      father: 'Rajendra Devi',
      dob: '03-12-2000',
      gender: 'Female',
      mobile: '9845002003',
      email: 'anita.devi@gmail.com',
      qual: 'Class X',
      course: 'Data Center Management',
      addr: '25 Market St',
      city: 'Nalgonda',
      dist: 'Nalgonda',
      state: 'Telangana',
    },
    {
      name: 'Raju Naidu',
      father: 'Srinivas Naidu',
      dob: '16-05-1998',
      gender: 'Male',
      mobile: '9845002004',
      email: 'raju.naidu@gmail.com',
      qual: 'Diploma',
      course: 'Data Center Management',
      addr: '35 Bankers Col',
      city: 'Kalwakurthy',
      dist: 'Nalgonda',
      state: 'Telangana',
    },
    {
      name: 'Priya Kumari',
      father: 'Anand Kumari',
      dob: '09-02-1997',
      gender: 'Female',
      mobile: '9845002005',
      email: 'priya.kumari@gmail.com',
      qual: 'Class XII',
      course: 'Data Center Management',
      addr: '45 New Colony',
      city: 'Kalwakurthy',
      dist: 'Nalgonda',
      state: 'Telangana',
    },
    // Belagavi Men (APR) - Welding
    {
      name: 'Amit Desai',
      father: 'Vijay Desai',
      dob: '20-06-2002',
      gender: 'Male',
      mobile: '9845003001',
      email: 'amit.desai@gmail.com',
      qual: 'Class X',
      course: 'ITI (Electrical / Wireman / Others)',
      addr: '7 Belgaum Rd',
      city: 'Belagavi',
      dist: 'Belagavi',
      state: 'Karnataka',
    },
    {
      name: 'Shweta Jadhav',
      father: 'Pramod Jadhav',
      dob: '14-09-2001',
      gender: 'Female',
      mobile: '9845003002',
      email: 'shweta.j@gmail.com',
      qual: 'Class XII',
      course: 'ITI (Electrical / Wireman / Others)',
      addr: '17 Station Rd',
      city: 'Belagavi',
      dist: 'Belagavi',
      state: 'Karnataka',
    },
    {
      name: 'Manoj Kulkarni',
      father: 'Sudhir Kulkarni',
      dob: '28-02-2000',
      gender: 'Male',
      mobile: '9845003003',
      email: 'manoj.k@gmail.com',
      qual: 'Class X',
      course: 'ITI (Electrical / Wireman / Others)',
      addr: '27 Temple Lane',
      city: 'Belagavi',
      dist: 'Belagavi',
      state: 'Karnataka',
    },
    {
      name: 'Neha Gaikwad',
      father: 'Santosh Gaikwad',
      dob: '11-11-1999',
      gender: 'Female',
      mobile: '9845003004',
      email: 'neha.g@gmail.com',
      qual: 'Diploma',
      course: 'ITI (Electrical / Wireman / Others)',
      addr: '37 Market Rd',
      city: 'Belagavi',
      dist: 'Belagavi',
      state: 'Karnataka',
    },
    {
      name: 'Vikas Patil',
      father: 'Ganesh Patil',
      dob: '07-03-1998',
      gender: 'Male',
      mobile: '9845003005',
      email: 'vikas.p@gmail.com',
      qual: 'Class XII',
      course: 'ITI (Electrical / Wireman / Others)',
      addr: '47 Civil Lines',
      city: 'Belagavi',
      dist: 'Belagavi',
      state: 'Karnataka',
    },
  ],
  'Don Bosco Tech Society': [
    // Bishna (FEB) - Hospitality
    {
      name: 'Arun Biswas',
      father: 'Tapan Biswas',
      dob: '10-04-1999',
      gender: 'Male',
      mobile: '9434001001',
      email: 'arun.biswas@gmail.com',
      qual: 'Class X',
      course: 'EDP (Entrepreneur Development Program)',
      addr: '1 Mission Rd',
      city: 'Bishna',
      dist: 'Murshidabad',
      state: 'West Bengal',
    },
    {
      name: 'Rina Mondal',
      father: 'Sukanta Mondal',
      dob: '23-08-2000',
      gender: 'Female',
      mobile: '9434001002',
      email: 'rina.m@gmail.com',
      qual: 'Class XII',
      course: 'EDP (Entrepreneur Development Program)',
      addr: '11 Church St',
      city: 'Bishna',
      dist: 'Murshidabad',
      state: 'West Bengal',
    },
    {
      name: 'Subhas Das',
      father: 'Nirmal Das',
      dob: '06-01-2001',
      gender: 'Male',
      mobile: '9434001003',
      email: 'subhas.d@gmail.com',
      qual: 'Class X',
      course: 'EDP (Entrepreneur Development Program)',
      addr: '21 College Rd',
      city: 'Bishna',
      dist: 'Murshidabad',
      state: 'West Bengal',
    },
    {
      name: 'Sangita Roy',
      father: 'Bimal Roy',
      dob: '17-05-1998',
      gender: 'Female',
      mobile: '9434001004',
      email: 'sangita.r@gmail.com',
      qual: 'Class XII',
      course: 'EDP (Entrepreneur Development Program)',
      addr: '31 Park St',
      city: 'Murshidabad',
      dist: 'Murshidabad',
      state: 'West Bengal',
    },
    {
      name: 'Dilip Ghosh',
      father: 'Probodh Ghosh',
      dob: '29-10-1997',
      gender: 'Male',
      mobile: '9434001005',
      email: 'dilip.g@gmail.com',
      qual: 'Diploma',
      course: 'EDP (Entrepreneur Development Program)',
      addr: '41 Main Bazaar',
      city: 'Bishna',
      dist: 'Murshidabad',
      state: 'West Bengal',
    },
    // Bastar (JAN) - Plumbing
    {
      name: 'Ramesh Baghel',
      father: 'Lakhman Baghel',
      dob: '08-02-2002',
      gender: 'Male',
      mobile: '7712001001',
      email: 'ramesh.b@gmail.com',
      qual: 'Class X',
      course: 'Industrial Automation',
      addr: '3 Jagdalpur Rd',
      city: 'Jagdalpur',
      dist: 'Bastar',
      state: 'Chhattisgarh',
    },
    {
      name: 'Sunitha Netam',
      father: 'Heera Netam',
      dob: '19-06-2001',
      gender: 'Female',
      mobile: '7712001002',
      email: 'sunitha.n@gmail.com',
      qual: 'Class XII',
      course: 'Industrial Automation',
      addr: '13 Forest Col',
      city: 'Jagdalpur',
      dist: 'Bastar',
      state: 'Chhattisgarh',
    },
    {
      name: 'Mahesh Kashyap',
      father: 'Tulsi Kashyap',
      dob: '01-10-2000',
      gender: 'Male',
      mobile: '7712001003',
      email: 'mahesh.k@gmail.com',
      qual: 'Class X',
      course: 'Industrial Automation',
      addr: '23 Tribal Area',
      city: 'Bastar',
      dist: 'Bastar',
      state: 'Chhattisgarh',
    },
    {
      name: 'Anita Patel',
      father: 'Kishor Patel',
      dob: '13-03-1999',
      gender: 'Female',
      mobile: '7712001004',
      email: 'anita.p@gmail.com',
      qual: 'Class XII',
      course: 'Industrial Automation',
      addr: '33 Main Rd',
      city: 'Jagdalpur',
      dist: 'Bastar',
      state: 'Chhattisgarh',
    },
    {
      name: 'Vijay Mandavi',
      father: 'Shankar Mandavi',
      dob: '24-07-1998',
      gender: 'Male',
      mobile: '7712001005',
      email: 'vijay.m@gmail.com',
      qual: 'Diploma',
      course: 'Industrial Automation',
      addr: '43 River Bank',
      city: 'Jagdalpur',
      dist: 'Bastar',
      state: 'Chhattisgarh',
    },
    // Ganjam (APR) - Retail Management
    {
      name: 'Priti Nayak',
      father: 'Durga Nayak',
      dob: '05-09-2003',
      gender: 'Female',
      mobile: '9437001001',
      email: 'priti.n@gmail.com',
      qual: 'Class X',
      course: 'Solar Solution',
      addr: '6 Sea View',
      city: 'Berhampur',
      dist: 'Ganjam',
      state: 'Odisha',
    },
    {
      name: 'Binod Rath',
      father: 'Bhaskar Rath',
      dob: '16-01-2002',
      gender: 'Male',
      mobile: '9437001002',
      email: 'binod.r@gmail.com',
      qual: 'Class XII',
      course: 'Solar Solution',
      addr: '16 Station Rd',
      city: 'Berhampur',
      dist: 'Ganjam',
      state: 'Odisha',
    },
    {
      name: 'Suchitra Das',
      father: 'Pradip Das',
      dob: '27-05-2001',
      gender: 'Female',
      mobile: '9437001003',
      email: 'suchitra.d@gmail.com',
      qual: 'Class X',
      course: 'Solar Solution',
      addr: '26 College Rd',
      city: 'Berhampur',
      dist: 'Ganjam',
      state: 'Odisha',
    },
    {
      name: 'Ajay Panda',
      father: 'Narayan Panda',
      dob: '09-11-2000',
      gender: 'Male',
      mobile: '9437001004',
      email: 'ajay.p@gmail.com',
      qual: 'Class XII',
      course: 'Solar Solution',
      addr: '36 Park Rd',
      city: 'Berhampur',
      dist: 'Ganjam',
      state: 'Odisha',
    },
    {
      name: 'Deepa Sahoo',
      father: 'Bharat Sahoo',
      dob: '20-07-1999',
      gender: 'Female',
      mobile: '9437001005',
      email: 'deepa.s@gmail.com',
      qual: 'Diploma',
      course: 'Solar Solution',
      addr: '46 Market Sq',
      city: 'Berhampur',
      dist: 'Ganjam',
      state: 'Odisha',
    },
  ],
  'Sri Sri Rural Development Trust': [
    // Guwahati Jail (APR) - Basic IT
    {
      name: 'Bipul Bora',
      father: 'Hemanta Bora',
      dob: '12-02-2000',
      gender: 'Male',
      mobile: '9435001001',
      email: 'bipul.b@gmail.com',
      qual: 'Class X',
      course: 'Data Center Management',
      addr: '2 Jail Rd',
      city: 'Guwahati',
      dist: 'Kamrup',
      state: 'Assam',
    },
    {
      name: 'Ankita Deka',
      father: 'Dilip Deka',
      dob: '23-06-2001',
      gender: 'Female',
      mobile: '9435001002',
      email: 'ankita.d@gmail.com',
      qual: 'Class XII',
      course: 'Data Center Management',
      addr: '12 Dispur Rd',
      city: 'Guwahati',
      dist: 'Kamrup',
      state: 'Assam',
    },
    {
      name: 'Ranjit Kalita',
      father: 'Tarun Kalita',
      dob: '04-10-1999',
      gender: 'Male',
      mobile: '9435001003',
      email: 'ranjit.k@gmail.com',
      qual: 'Class X',
      course: 'Data Center Management',
      addr: '22 Fancy Bazar',
      city: 'Guwahati',
      dist: 'Kamrup',
      state: 'Assam',
    },
    {
      name: 'Pallabi Saikia',
      father: 'Narayan Saikia',
      dob: '15-03-1998',
      gender: 'Female',
      mobile: '9435001004',
      email: 'pallabi.s@gmail.com',
      qual: 'Class XII',
      course: 'Data Center Management',
      addr: '32 Ulubari',
      city: 'Guwahati',
      dist: 'Kamrup',
      state: 'Assam',
    },
    {
      name: 'Deepjyoti Baruah',
      father: 'Kishore Baruah',
      dob: '26-07-1997',
      gender: 'Male',
      mobile: '9435001005',
      email: 'deepjyoti.b@gmail.com',
      qual: 'Diploma',
      course: 'Data Center Management',
      addr: '42 Pan Bazar',
      city: 'Guwahati',
      dist: 'Kamrup',
      state: 'Assam',
    },
    // Barielly (JAN) - Electrician
    {
      name: 'Aditya Singh',
      father: 'Rajendra Singh',
      dob: '18-04-2002',
      gender: 'Male',
      mobile: '9412001001',
      email: 'aditya.s@gmail.com',
      qual: 'Class X',
      course: 'Basic Electrician',
      addr: '5 Civil Lines',
      city: 'Bareilly',
      dist: 'Bareilly',
      state: 'Uttar Pradesh',
    },
    {
      name: 'Pooja Verma',
      father: 'Umesh Verma',
      dob: '29-08-2001',
      gender: 'Female',
      mobile: '9412001002',
      email: 'pooja.v@gmail.com',
      qual: 'Class XII',
      course: 'Basic Electrician',
      addr: '15 Nehru Rd',
      city: 'Bareilly',
      dist: 'Bareilly',
      state: 'Uttar Pradesh',
    },
    {
      name: 'Rohit Gupta',
      father: 'Suresh Gupta',
      dob: '10-12-2000',
      gender: 'Male',
      mobile: '9412001003',
      email: 'rohit.g@gmail.com',
      qual: 'Class X',
      course: 'Basic Electrician',
      addr: '25 Gandhi Nagar',
      city: 'Bareilly',
      dist: 'Bareilly',
      state: 'Uttar Pradesh',
    },
    {
      name: 'Nisha Yadav',
      father: 'Hari Yadav',
      dob: '21-05-1999',
      gender: 'Female',
      mobile: '9412001004',
      email: 'nisha.y@gmail.com',
      qual: 'Class XII',
      course: 'Basic Electrician',
      addr: '35 Patel Nagar',
      city: 'Bareilly',
      dist: 'Bareilly',
      state: 'Uttar Pradesh',
    },
    {
      name: 'Sachin Mishra',
      father: 'Vivek Mishra',
      dob: '02-02-1998',
      gender: 'Male',
      mobile: '9412001005',
      email: 'sachin.m@gmail.com',
      qual: 'Diploma',
      course: 'Basic Electrician',
      addr: '45 Civil Station',
      city: 'Bareilly',
      dist: 'Bareilly',
      state: 'Uttar Pradesh',
    },
    // Kathua (FEB) - Fashion Design
    {
      name: 'Sana Sharma',
      father: 'Vikram Sharma',
      dob: '08-06-2003',
      gender: 'Female',
      mobile: '9469001001',
      email: 'sana.s@gmail.com',
      qual: 'Class X',
      course: 'EDP (Entrepreneur Development Program)',
      addr: '3 Kathua Rd',
      city: 'Kathua',
      dist: 'Kathua',
      state: 'Jammu and Kashmir',
    },
    {
      name: 'Amit Bhatt',
      father: 'Rajesh Bhatt',
      dob: '19-10-2002',
      gender: 'Male',
      mobile: '9469001002',
      email: 'amit.b@gmail.com',
      qual: 'Class XII',
      course: 'EDP (Entrepreneur Development Program)',
      addr: '13 Market Rd',
      city: 'Kathua',
      dist: 'Kathua',
      state: 'Jammu and Kashmir',
    },
    {
      name: 'Nandini Dutta',
      father: 'Pramod Dutta',
      dob: '30-01-2001',
      gender: 'Female',
      mobile: '9469001003',
      email: 'nandini.d@gmail.com',
      qual: 'Class X',
      course: 'EDP (Entrepreneur Development Program)',
      addr: '23 New Colony',
      city: 'Kathua',
      dist: 'Kathua',
      state: 'Jammu and Kashmir',
    },
    {
      name: 'Suraj Thakur',
      father: 'Mohan Thakur',
      dob: '11-07-2000',
      gender: 'Male',
      mobile: '9469001004',
      email: 'suraj.t@gmail.com',
      qual: 'Class XII',
      course: 'EDP (Entrepreneur Development Program)',
      addr: '33 Bus Stand',
      city: 'Kathua',
      dist: 'Kathua',
      state: 'Jammu and Kashmir',
    },
    {
      name: 'Prerna Kapoor',
      father: 'Anil Kapoor',
      dob: '22-11-1999',
      gender: 'Female',
      mobile: '9469001005',
      email: 'prerna.k@gmail.com',
      qual: 'Diploma',
      course: 'EDP (Entrepreneur Development Program)',
      addr: '43 Main Chowk',
      city: 'Kathua',
      dist: 'Kathua',
      state: 'Jammu and Kashmir',
    },
  ],
};

// ─── COMPUTE STUDENT IDs ─────────────────────────────────────────────────────
function normalizeToken(value, length) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, length)
    .padEnd(length, 'X');
}

function formatDateToken(dob) {
  // Input format: DD-MM-YYYY
  const [d, m, y] = dob.split('-');
  return `${y}${m}${d}`;
}

function computeStudentId(student) {
  return (
    normalizeToken(student.name, 3) +
    normalizeToken(student.father, 3) +
    formatDateToken(student.dob) +
    normalizeToken(student.course, 4)
  );
}

// ─── TOT TRAINER DATA ────────────────────────────────────────────────────────
const TOT_TRAINERS = {
  'Gram Vikas Society': [
    // Jan batch – CITS
    {
      center: 'Govt ITI Bhalki',
      centerType: 'ITI',
      isSeif: 'Yes',
      seifId: '049e7125-51f6-454c-bbf6-1f0d76110dbf',
      partnerName: 'Gram Vikas Society',
      centerName: 'Govt ITI Bhalki',
      batchNo: 'TOT-GVS-001',
      batchStart: '20-01-2025',
      batchEnd: '25-01-2025',
      module: 'CITS',
      firstName: 'Suresh',
      lastName: 'Patil',
      dob: '12-03-1980',
      gender: 'Male',
      contact: '9845000101',
      email: 'suresh.patil.tot@gmail.com',
      lang: 'Kannada, Hindi',
      addr: '10 ITI Campus, Bhalki',
      city: 'Bidar',
      state: 'Karnataka',
      qual: 'B.Tech',
    },
    {
      center: 'Govt ITI Bhalki',
      centerType: 'ITI',
      isSeif: 'Yes',
      seifId: '049e7125-51f6-454c-bbf6-1f0d76110dbf',
      partnerName: 'Gram Vikas Society',
      centerName: 'Govt ITI Bhalki',
      batchNo: 'TOT-GVS-001',
      batchStart: '20-01-2025',
      batchEnd: '25-01-2025',
      module: 'CITS',
      firstName: 'Lata',
      lastName: 'Desai',
      dob: '05-07-1985',
      gender: 'Female',
      contact: '9845000102',
      email: 'lata.desai.tot@gmail.com',
      lang: 'Kannada',
      addr: '20 Main Rd, Bhalki',
      city: 'Bidar',
      state: 'Karnataka',
      qual: 'M.Sc',
    },
    // Feb batch – MES
    {
      center: 'GOVT ITI KALWAKURTHY',
      centerType: 'ITI',
      isSeif: 'Yes',
      seifId: '072ac566-2294-40d7-acf1-0ccab410de4d',
      partnerName: 'Gram Vikas Society',
      centerName: 'GOVT ITI KALWAKURTHY',
      batchNo: 'TOT-GVS-002',
      batchStart: '15-02-2025',
      batchEnd: '20-02-2025',
      module: 'MES',
      firstName: 'Ravi',
      lastName: 'Reddy',
      dob: '22-09-1978',
      gender: 'Male',
      contact: '9845000201',
      email: 'ravi.reddy.tot@gmail.com',
      lang: 'Telugu, Hindi',
      addr: '30 ITI Rd, Kalwakurthy',
      city: 'Nalgonda',
      state: 'Telangana',
      qual: 'B.E.',
    },
    {
      center: 'GOVT ITI KALWAKURTHY',
      centerType: 'ITI',
      isSeif: 'Yes',
      seifId: '072ac566-2294-40d7-acf1-0ccab410de4d',
      partnerName: 'Gram Vikas Society',
      centerName: 'GOVT ITI KALWAKURTHY',
      batchNo: 'TOT-GVS-002',
      batchStart: '15-02-2025',
      batchEnd: '20-02-2025',
      module: 'MES',
      firstName: 'Asha',
      lastName: 'Yadav',
      dob: '14-02-1983',
      gender: 'Female',
      contact: '9845000202',
      email: 'asha.yadav.tot@gmail.com',
      lang: 'Telugu',
      addr: '40 College Rd, Nalgonda',
      city: 'Nalgonda',
      state: 'Telangana',
      qual: 'M.A.',
    },
    // Apr batch – CTS
    {
      center: 'Govt ITI Belagavi Men',
      centerType: 'ITI',
      isSeif: 'Yes',
      seifId: '0881c380-6d3a-434a-beea-5bd731ecdc12',
      partnerName: 'Gram Vikas Society',
      centerName: 'Govt ITI Belagavi Men',
      batchNo: 'TOT-GVS-003',
      batchStart: '10-04-2025',
      batchEnd: '15-04-2025',
      module: 'CTS',
      firstName: 'Mahesh',
      lastName: 'Kulkarni',
      dob: '30-11-1979',
      gender: 'Male',
      contact: '9845000301',
      email: 'mahesh.k.tot@gmail.com',
      lang: 'Kannada, Marathi',
      addr: '50 Station Rd, Belagavi',
      city: 'Belagavi',
      state: 'Karnataka',
      qual: 'B.Tech',
    },
    {
      center: 'Govt ITI Belagavi Men',
      centerType: 'ITI',
      isSeif: 'Yes',
      seifId: '0881c380-6d3a-434a-beea-5bd731ecdc12',
      partnerName: 'Gram Vikas Society',
      centerName: 'Govt ITI Belagavi Men',
      batchNo: 'TOT-GVS-003',
      batchStart: '10-04-2025',
      batchEnd: '15-04-2025',
      module: 'CTS',
      firstName: 'Rekha',
      lastName: 'Joshi',
      dob: '18-04-1987',
      gender: 'Female',
      contact: '9845000302',
      email: 'rekha.j.tot@gmail.com',
      lang: 'Kannada',
      addr: '60 Civil Rd, Belagavi',
      city: 'Belagavi',
      state: 'Karnataka',
      qual: 'M.Com',
    },
  ],
  'Don Bosco Tech Society': [
    // Feb batch – PMKVY
    {
      center: 'Don Bosco Bishna',
      centerType: 'NGO',
      isSeif: 'Yes',
      seifId: '004039d9-e25a-4a2e-aa57-12c93366c9d7',
      partnerName: 'Don Bosco Tech Society',
      centerName: 'Don Bosco Bishna',
      batchNo: 'TOT-DBT-001',
      batchStart: '12-02-2025',
      batchEnd: '17-02-2025',
      module: 'PMKVY',
      firstName: 'Anthony',
      lastName: 'Fernandes',
      dob: '07-06-1975',
      gender: 'Male',
      contact: '9434000101',
      email: 'anthony.f.tot@gmail.com',
      lang: 'Bengali, English',
      addr: '1 Mission Rd, Bishna',
      city: 'Murshidabad',
      state: 'West Bengal',
      qual: 'B.A.',
    },
    {
      center: 'Don Bosco Bishna',
      centerType: 'NGO',
      isSeif: 'Yes',
      seifId: '004039d9-e25a-4a2e-aa57-12c93366c9d7',
      partnerName: 'Don Bosco Tech Society',
      centerName: 'Don Bosco Bishna',
      batchNo: 'TOT-DBT-001',
      batchStart: '12-02-2025',
      batchEnd: '17-02-2025',
      module: 'PMKVY',
      firstName: 'Maria',
      lastName: "D'Souza",
      dob: '19-11-1982',
      gender: 'Female',
      contact: '9434000102',
      email: 'maria.d.tot@gmail.com',
      lang: 'Bengali',
      addr: '11 Church St, Bishna',
      city: 'Murshidabad',
      state: 'West Bengal',
      qual: 'M.Sc',
    },
    // Jan batch – CITS
    {
      center: 'Don Bosco Bastar',
      centerType: 'NGO',
      isSeif: 'Yes',
      seifId: '00862ee5-76e9-40e9-b575-291dd4330909',
      partnerName: 'Don Bosco Tech Society',
      centerName: 'Don Bosco Bastar',
      batchNo: 'TOT-DBT-002',
      batchStart: '18-01-2025',
      batchEnd: '23-01-2025',
      module: 'CITS',
      firstName: 'Joseph',
      lastName: 'Kujur',
      dob: '14-08-1977',
      gender: 'Male',
      contact: '7712000201',
      email: 'joseph.k.tot@gmail.com',
      lang: 'Hindi, Gondi',
      addr: '5 Tribal Colony, Bastar',
      city: 'Jagdalpur',
      state: 'Chhattisgarh',
      qual: 'B.E.',
    },
    {
      center: 'Don Bosco Bastar',
      centerType: 'NGO',
      isSeif: 'Yes',
      seifId: '00862ee5-76e9-40e9-b575-291dd4330909',
      partnerName: 'Don Bosco Tech Society',
      centerName: 'Don Bosco Bastar',
      batchNo: 'TOT-DBT-002',
      batchStart: '18-01-2025',
      batchEnd: '23-01-2025',
      module: 'CITS',
      firstName: 'Sunita',
      lastName: 'Markam',
      dob: '26-03-1985',
      gender: 'Female',
      contact: '7712000202',
      email: 'sunita.m.tot@gmail.com',
      lang: 'Hindi',
      addr: '15 Forest Rd, Bastar',
      city: 'Jagdalpur',
      state: 'Chhattisgarh',
      qual: 'M.A.',
    },
    // Apr batch – STRIVE
    {
      center: 'Don Bosco Ganjam',
      centerType: 'NGO',
      isSeif: 'Yes',
      seifId: '0136a230-9c58-405d-a414-0bde9b2b6cad',
      partnerName: 'Don Bosco Tech Society',
      centerName: 'Don Bosco Ganjam',
      batchNo: 'TOT-DBT-003',
      batchStart: '05-04-2025',
      batchEnd: '10-04-2025',
      module: 'STRIVE',
      firstName: 'Xavier',
      lastName: 'Panigrahi',
      dob: '03-01-1973',
      gender: 'Male',
      contact: '9437000301',
      email: 'xavier.p.tot@gmail.com',
      lang: 'Odia, English',
      addr: '8 Beach Rd, Berhampur',
      city: 'Berhampur',
      state: 'Odisha',
      qual: 'B.Tech',
    },
    {
      center: 'Don Bosco Ganjam',
      centerType: 'NGO',
      isSeif: 'Yes',
      seifId: '0136a230-9c58-405d-a414-0bde9b2b6cad',
      partnerName: 'Don Bosco Tech Society',
      centerName: 'Don Bosco Ganjam',
      batchNo: 'TOT-DBT-003',
      batchStart: '05-04-2025',
      batchEnd: '10-04-2025',
      module: 'STRIVE',
      firstName: 'Anjali',
      lastName: 'Behera',
      dob: '15-09-1988',
      gender: 'Female',
      contact: '9437000302',
      email: 'anjali.b.tot@gmail.com',
      lang: 'Odia',
      addr: '18 Main Rd, Ganjam',
      city: 'Berhampur',
      state: 'Odisha',
      qual: 'M.Com',
    },
  ],
  'Sri Sri Rural Development Trust': [
    // Apr batch – MES
    {
      center: 'SSRDPT Guwahati Jail',
      centerType: 'NGO',
      isSeif: 'Yes',
      seifId: '037f153d-4d09-466c-895e-c7e3823e8f84',
      partnerName: 'Sri Sri Rural Development Trust',
      centerName: 'SSRDPT Guwahati Jail',
      batchNo: 'TOT-SSRD-001',
      batchStart: '08-04-2025',
      batchEnd: '13-04-2025',
      module: 'MES',
      firstName: 'Pranab',
      lastName: 'Bora',
      dob: '21-05-1976',
      gender: 'Male',
      contact: '9435000101',
      email: 'pranab.b.tot@gmail.com',
      lang: 'Assamese, Hindi',
      addr: '2 Jail Colony, Guwahati',
      city: 'Guwahati',
      state: 'Assam',
      qual: 'B.Sc',
    },
    {
      center: 'SSRDPT Guwahati Jail',
      centerType: 'NGO',
      isSeif: 'Yes',
      seifId: '037f153d-4d09-466c-895e-c7e3823e8f84',
      partnerName: 'Sri Sri Rural Development Trust',
      centerName: 'SSRDPT Guwahati Jail',
      batchNo: 'TOT-SSRD-001',
      batchStart: '08-04-2025',
      batchEnd: '13-04-2025',
      module: 'MES',
      firstName: 'Nirmali',
      lastName: 'Deka',
      dob: '12-10-1984',
      gender: 'Female',
      contact: '9435000102',
      email: 'nirmali.d.tot@gmail.com',
      lang: 'Assamese',
      addr: '12 Guwahati Rd',
      city: 'Guwahati',
      state: 'Assam',
      qual: 'M.A.',
    },
    // Jan batch – CTS
    {
      center: 'Govt ITI Barielly',
      centerType: 'ITI',
      isSeif: 'Yes',
      seifId: '04c9ebbe-9113-4290-8f5d-92653a9349cb',
      partnerName: 'Sri Sri Rural Development Trust',
      centerName: 'Govt ITI Barielly',
      batchNo: 'TOT-SSRD-002',
      batchStart: '22-01-2025',
      batchEnd: '27-01-2025',
      module: 'CTS',
      firstName: 'Sunil',
      lastName: 'Sharma',
      dob: '08-04-1979',
      gender: 'Male',
      contact: '9412000201',
      email: 'sunil.s.tot@gmail.com',
      lang: 'Hindi, English',
      addr: '7 ITI Campus, Bareilly',
      city: 'Bareilly',
      state: 'Uttar Pradesh',
      qual: 'B.Tech',
    },
    {
      center: 'Govt ITI Barielly',
      centerType: 'ITI',
      isSeif: 'Yes',
      seifId: '04c9ebbe-9113-4290-8f5d-92653a9349cb',
      partnerName: 'Sri Sri Rural Development Trust',
      centerName: 'Govt ITI Barielly',
      batchNo: 'TOT-SSRD-002',
      batchStart: '22-01-2025',
      batchEnd: '27-01-2025',
      module: 'CTS',
      firstName: 'Sunita',
      lastName: 'Verma',
      dob: '30-08-1986',
      gender: 'Female',
      contact: '9412000202',
      email: 'sunita.v.tot@gmail.com',
      lang: 'Hindi',
      addr: '17 Civil Lines, Bareilly',
      city: 'Bareilly',
      state: 'Uttar Pradesh',
      qual: 'M.Sc',
    },
    // Feb batch – STRIVE
    {
      center: 'Govt ITI Kathua',
      centerType: 'ITI',
      isSeif: 'Yes',
      seifId: '08af3beb-1dfd-474c-abe2-b1675eb9fc51',
      partnerName: 'Sri Sri Rural Development Trust',
      centerName: 'Govt ITI Kathua',
      batchNo: 'TOT-SSRD-003',
      batchStart: '17-02-2025',
      batchEnd: '22-02-2025',
      module: 'STRIVE',
      firstName: 'Rajiv',
      lastName: 'Kapoor',
      dob: '16-12-1971',
      gender: 'Male',
      contact: '9469000301',
      email: 'rajiv.k.tot@gmail.com',
      lang: 'Dogri, Hindi',
      addr: '9 ITI Road, Kathua',
      city: 'Kathua',
      state: 'Jammu and Kashmir',
      qual: 'B.E.',
    },
    {
      center: 'Govt ITI Kathua',
      centerType: 'ITI',
      isSeif: 'Yes',
      seifId: '08af3beb-1dfd-474c-abe2-b1675eb9fc51',
      partnerName: 'Sri Sri Rural Development Trust',
      centerName: 'Govt ITI Kathua',
      batchNo: 'TOT-SSRD-003',
      batchStart: '17-02-2025',
      batchEnd: '22-02-2025',
      module: 'STRIVE',
      firstName: 'Zainab',
      lastName: 'Mir',
      dob: '27-06-1990',
      gender: 'Female',
      contact: '9469000302',
      email: 'zainab.m.tot@gmail.com',
      lang: 'Kashmiri, Urdu',
      addr: '19 Main Chowk, Kathua',
      city: 'Kathua',
      state: 'Jammu and Kashmir',
      qual: 'M.A.',
    },
  ],
};

// ─── EMPLOYMENT STATUS OPTIONS ───────────────────────────────────────────────
const EMPLOYERS = [
  {
    name: 'Infosys BPO Ltd',
    location: 'Bangalore, Karnataka',
    desig: 'Customer Support Executive',
    salary: '18000',
  },
  {
    name: 'Tata Consultancy Services',
    location: 'Hyderabad, Telangana',
    desig: 'Data Entry Operator',
    salary: '15000',
  },
  { name: 'HDFC Bank', location: 'Pune, Maharashtra', desig: 'Sales Executive', salary: '20000' },
  {
    name: 'Flipkart Logistics',
    location: 'Bangalore, Karnataka',
    desig: 'Warehouse Associate',
    salary: '14000',
  },
  {
    name: 'Apollo Hospitals',
    location: 'Chennai, Tamil Nadu',
    desig: 'Ward Assistant',
    salary: '16000',
  },
  {
    name: 'Reliance Retail',
    location: 'Mumbai, Maharashtra',
    desig: 'Retail Associate',
    salary: '17000',
  },
  {
    name: 'Amazon India',
    location: 'Hyderabad, Telangana',
    desig: 'Delivery Associate',
    salary: '19000',
  },
  {
    name: 'ITI Pvt Ltd',
    location: 'Bangalore, Karnataka',
    desig: 'Electrician Trainee',
    salary: '13500',
  },
  { name: 'ITC Hotels', location: 'Kolkata, West Bengal', desig: 'F&B Associate', salary: '15500' },
  { name: 'Bata India Ltd', location: 'Patna, Bihar', desig: 'Store Assistant', salary: '12000' },
];

const EMP_DATES = [
  '01-02-2025',
  '15-02-2025',
  '01-03-2025',
  '05-03-2025',
  '20-03-2025',
  '01-04-2025',
  '10-04-2025',
  '20-04-2025',
  '05-05-2025',
  '01-05-2025',
  '15-05-2025',
  '01-06-2025',
  '01-01-2025',
  '15-01-2025',
  '10-01-2025',
];

// ─── XLSX HELPERS ─────────────────────────────────────────────────────────────
function applyHeaderStyle(row) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  row.height = 30;
}

function autoFitColumns(worksheet, minWidth = 12) {
  worksheet.columns.forEach((col) => {
    let max = minWidth;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const len = String(cell.value || '').length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 40);
  });
}

// ─── CREATE STUDENT WORKBOOK ─────────────────────────────────────────────────
async function createStudentWorkbook(partnerName) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SEIF Portal - Dummy Data Generator';
  wb.created = new Date();

  const ws = wb.addWorksheet('Student Data', { views: [{ state: 'frozen', ySplit: 1 }] });

  const headers = [
    'Center ID',
    'Batch Number',
    'Batch Start Date',
    'Batch End Date',
    'Name of the Trainee',
    'DOB',
    'Father Name',
    'Gender',
    'Mobile Number',
    'Email ID',
    'Qualification',
    'Course Attended',
    'Student Address',
    'Student City',
    'Student District',
    'Student State',
  ];
  ws.addRow(headers);
  applyHeaderStyle(ws.getRow(1));

  const partner = PARTNERS.find((p) => p.name === partnerName);
  const students = STUDENT_POOLS[partnerName];
  let studentIndex = 0;

  partner.centers.forEach((center) => {
    const dates = BATCH_DATES[center.month];
    const batchNumber = `BATCH-${partnerName.slice(0, 3).toUpperCase()}-${center.month}25`;

    for (let i = 0; i < 5; i++) {
      const s = students[studentIndex++];
      const row = ws.addRow([
        center.code,
        batchNumber,
        dates.start,
        dates.end,
        s.name,
        s.dob,
        s.father,
        s.gender,
        s.mobile,
        s.email,
        s.qual,
        s.course,
        s.addr,
        s.city,
        s.dist,
        s.state,
      ]);
      row.eachCell((cell, colNum) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        if (colNum % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F6FC' } };
        }
      });
    }
  });

  autoFitColumns(ws);
  const fileName = `${partnerName.replace(/[^a-zA-Z0-9]/g, '_')}_student_upload.xlsx`;
  const filePath = path.join(OUT, fileName);
  await wb.xlsx.writeFile(filePath);
  console.log('✓ Created:', fileName);
  return filePath;
}

// ─── CREATE EMPLOYMENT WORKBOOK ──────────────────────────────────────────────
async function createEmploymentWorkbook(partnerName) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SEIF Portal - Dummy Data Generator';

  const ws = wb.addWorksheet('Employment Data', { views: [{ state: 'frozen', ySplit: 1 }] });

  const headers = [
    'Center ID',
    'Student ID',
    'Batch ID',
    'Student Name',
    'Father Name',
    'Employment Status',
    'Name of the company or Organization',
    'Location of the company',
    'Date of joining/Date of Inception',
    'Designation',
    'Salary per month/Income',
  ];
  ws.addRow(headers);
  applyHeaderStyle(ws.getRow(1));

  const partner = PARTNERS.find((p) => p.name === partnerName);
  const students = STUDENT_POOLS[partnerName];
  let studentIndex = 0;
  let empIndex = 0;

  partner.centers.forEach((center) => {
    const dates = BATCH_DATES[center.month];
    const batchNumber = `BATCH-${partnerName.slice(0, 3).toUpperCase()}-${center.month}25`;

    for (let i = 0; i < 5; i++) {
      const s = students[studentIndex++];
      const studentId = computeStudentId(s);
      const emp = EMPLOYERS[empIndex % EMPLOYERS.length];
      empIndex++;
      const empDate = EMP_DATES[(studentIndex - 1) % EMP_DATES.length];
      const status = i % 3 === 0 ? 'Self-Employed' : 'Employed';

      const row = ws.addRow([
        center.code,
        studentId,
        batchNumber,
        s.name,
        s.father,
        status,
        status === 'Self-Employed' ? 'Self - ' + s.course : emp.name,
        status === 'Self-Employed' ? s.city + ', ' + s.state : emp.location,
        empDate,
        status === 'Self-Employed' ? s.course + ' Practitioner' : emp.desig,
        status === 'Self-Employed' ? '10000' : emp.salary,
      ]);
      row.eachCell((cell, colNum) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        if (colNum % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F6FC' } };
        }
      });
    }
  });

  autoFitColumns(ws);
  const fileName = `${partnerName.replace(/[^a-zA-Z0-9]/g, '_')}_employment_upload.xlsx`;
  const filePath = path.join(OUT, fileName);
  await wb.xlsx.writeFile(filePath);
  console.log('✓ Created:', fileName);
  return filePath;
}

// ─── CREATE TOT WORKBOOK ─────────────────────────────────────────────────────
async function createTotWorkbook(partnerName) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SEIF Portal - Dummy Data Generator';

  const ws = wb.addWorksheet('TOT Data', { views: [{ state: 'frozen', ySplit: 1 }] });

  const headers = [
    'TOT Center',
    'Center Type',
    'SEIF Center (yes/no)',
    'SEIF Center ID',
    'Trainer Partner Name',
    'Trainer Center Name',
    'Trainer Batch No',
    'Trainer Batch Start Date',
    'Trainer Batch End Date',
    'Trainer Module Trained',
    'First Name',
    'Last Name',
    'DOB',
    'Gender',
    'Contact Number',
    'Email ID',
    'Qualification',
    'Language Knows',
    'Contact Address',
    'City',
    'State',
  ];
  ws.addRow(headers);
  applyHeaderStyle(ws.getRow(1));

  const trainers = TOT_TRAINERS[partnerName];
  trainers.forEach((t, idx) => {
    const row = ws.addRow([
      t.center,
      t.centerType,
      t.isSeif,
      t.seifId,
      t.partnerName,
      t.centerName,
      t.batchNo,
      t.batchStart,
      t.batchEnd,
      t.module,
      t.firstName,
      t.lastName,
      t.dob,
      t.gender,
      t.contact,
      t.email,
      t.qual,
      t.lang,
      t.addr,
      t.city,
      t.state,
    ]);
    row.eachCell((cell, colNum) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      if (colNum % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F6FC' } };
      }
    });
  });

  autoFitColumns(ws);
  const fileName = `${partnerName.replace(/[^a-zA-Z0-9]/g, '_')}_tot_upload.xlsx`;
  const filePath = path.join(OUT, fileName);
  await wb.xlsx.writeFile(filePath);
  console.log('✓ Created:', fileName);
  return filePath;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Generating dummy test data files...\n');
  console.log('Output folder:', OUT);
  console.log('');

  for (const partner of PARTNERS) {
    console.log(`\n── ${partner.name} (${partner.login})`);
    await createStudentWorkbook(partner.name);
    await createEmploymentWorkbook(partner.name);
    await createTotWorkbook(partner.name);
  }

  // Print computed student IDs for reference
  console.log('\n\n=== COMPUTED STUDENT IDs (for employment file reference) ===');
  for (const [pName, students] of Object.entries(STUDENT_POOLS)) {
    const partner = PARTNERS.find((p) => p.name === pName);
    let i = 0;
    console.log(`\n${pName}:`);
    partner.centers.forEach((center) => {
      const batchNumber = `BATCH-${pName.slice(0, 3).toUpperCase()}-${center.month}25`;
      console.log(`  Center: ${center.name}  Batch: ${batchNumber}`);
      for (let j = 0; j < 5; j++) {
        const s = students[i++];
        console.log(`    [${computeStudentId(s)}] ${s.name}`);
      }
    });
  }

  console.log('\n✅ All files generated successfully!');
  console.log(`📂 Location: ${OUT}`);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
