import type { Playlist, Song } from '../types'

type Lane = 'romance' | 'party' | 'classic' | 'sufi'

type Entry = Song & { lane: Lane }

function track(
  trackId: number,
  title: string,
  artist: string,
  lane: Lane,
  aliases?: readonly string[],
): Entry {
  return aliases ? { trackId, title, artist, lane, aliases } : { trackId, title, artist, lane }
}

// Kesariya stays first so a catalog-ordered game still opens on it.
const entries: readonly Entry[] = [
  track(1635014240, 'Kesariya', 'Pritam, Arijit Singh & Amitabh Bhattacharya', 'romance'),
  track(1073359419, 'Tum Hi Ho', 'Mithoon & Arijit Singh', 'romance'),
  track(300388792, 'Kal Ho Naa Ho', 'Shankar Ehsaan Loy & Sonu Nigam', 'classic', ['Kal Ho Na Ho']),
  track(1169015785, 'Channa Mereya', 'Pritam & Arijit Singh', 'romance', ['Chana Mereya']),
  track(1653219849, 'Apna Bana Le', 'Arijit Singh, Sachin-Jigar & Amitabh Bhattacharya', 'romance'),
  track(1123241921, 'Kun Faya Kun', 'A.R. Rahman, Javed Ali & Mohit Chauhan', 'sufi'),
  track(1130322151, 'Chaiyya Chaiyya', 'Sukhwinder Singh & Sapna Awasthi', 'classic', ['Chaiya Chaiya']),
  track(1057567670, 'Gerua', 'Pritam, Arijit Singh & Antara Mitra', 'romance'),
  track(1070912815, 'Ilahi', 'Pritam & Arijit Singh', 'sufi'),
  track(1117420365, 'Raabta', 'Pritam, Hamsika, Arijit Singh & Joi', 'romance', ['Rabta']),
  track(1134725347, 'Tum Se Hi', 'Pritam & Mohit Chauhan', 'romance'),
  track(1071074558, 'Agar Tum Saath Ho', 'Alka Yagnik & Arijit Singh', 'romance', ['Agar Tum Sath Ho']),
  track(1070912834, 'Kabira', 'Pritam, Harshdeep & Arijit Singh', 'sufi'),
  track(1123340746, 'Pee Loon', 'Pritam & Mohit Chauhan', 'romance'),
  track(1263940994, 'Hawayein', 'Pritam & Arijit Singh', 'romance', ['Hawayen', 'Hawaien']),
  track(1499107789, 'Shayad', 'Pritam & Arijit Singh', 'romance'),
  track(1468448742, 'Tujhe Kitna Chahne Lage', 'Arijit Singh', 'romance', [
    'Tujhe Kitna Chaahne Lage',
    'Tujhe Kitna Chahne Lage Hum',
  ]),
  track(660561134, 'Tum Mile', 'Neeraj Shridhar & Pritam', 'romance'),
  track(1057567677, 'Janam Janam', 'Pritam, Antara Mitra & Arijit Singh', 'romance'),
  track(1111741439, 'Galliyan', 'Ankit Tiwari', 'romance', ['Galiyan']),
  track(887456975, 'Samjhawan', 'Arijit Singh & Shreya Ghoshal', 'romance', ['Samjhawan Unplugged']),
  track(1189133564, 'Enna Sona', 'A.R. Rahman & Arijit Singh', 'romance'),
  track(1810439755, 'Phir Bhi Tumko Chaahunga', 'Mithoon, Arijit Singh & Shashaa Tirupati', 'romance', [
    'Phir Bhi Tumko Chahunga',
  ]),
  track(1468448744, 'Tera Ban Jaunga', 'Akhil Sachdeva & Tulsi Kumar', 'romance'),
  track(1205913429, 'Humsafar', 'Akhil Sachdeva & Mansheel Gujral', 'romance'),
  track(1580955743, 'Raataan Lambiyan', 'Tanishk Bagchi, Jubin Nautiyal & Asees Kaur', 'romance', [
    'Raatan Lambiyan',
    'Rataan Lambiyan',
  ]),
  track(656016091, 'Tum Tak', 'A.R. Rahman, Javed Ali & Kirti Sagathia', 'romance'),
  track(1468448738, 'Bekhayali', 'Sachet Tandon', 'romance'),
  track(1553611733, 'Dil Diyan Gallan', 'Atif Aslam', 'romance'),
  track(1478499923, 'Khairiyat', 'Pritam & Arijit Singh', 'romance'),
  track(1482235392, 'Tum Hi Aana', 'Payal Dev & Jubin Nautiyal', 'romance'),
  track(1702461667, 'Chaleya', 'Anirudh Ravichander, Arijit Singh & Shilpa Rao', 'romance'),
  track(1070912828, 'Subhanallah', 'Pritam, Sreeram & Shilpa Rao', 'romance', ['Subhan Allah']),
  track(1477605521, 'Pachtaoge', 'Arijit Singh', 'romance'),
  track(1730464043, 'Sajni', 'Ram Sampath & Arijit Singh', 'romance'),
  track(1720723962, 'O Maahi', 'Pritam & Arijit Singh', 'romance', ['Oh Maahi']),
  track(1529543285, 'Qaafirana', 'Arijit Singh & Nikhita Gandhi', 'romance', ['Kafirana', 'Qaafiraana']),
  track(1529541384, 'Ve Maahi', 'Arijit Singh & Asees Kaur', 'romance'),
  track(1580955750, 'Ranjha', 'Jasleen Royal & B. Praak', 'romance'),
  track(1690466656, 'Heeriye', 'Jasleen Royal & Arijit Singh', 'romance'),
  track(1174924385, 'Bulleya', 'Pritam, Amit Mishra & Shilpa Rao', 'romance'),
  track(1131692261, 'Masakali', 'Mohit Chauhan', 'romance'),
  track(1070912803, 'Badtameez Dil', 'Pritam, Benny Dayal & Shefali Alvares', 'party', ['Badtamez Dil']),
  track(1088788681, 'Kar Gayi Chull', 'Badshah, Amaal Mallik, Fazilpuria & Neha Kakkar', 'party'),
  track(1529568809, 'Kala Chashma', 'Badshah, Neha Kakkar & Indeep Bakshi', 'party', ['Kaala Chashma']),
  track(1116194835, 'London Thumakda', 'Labh Janjua, Sonu Kakkar, Neha Kakkar & Amit Trivedi', 'party'),
  track(1111783498, 'Abhi Toh Party Shuru Hui Hai', 'Badshah & Aastha', 'party', ['Abhi Toh Party']),
  track(1181809040, 'Nashe Si Chadh Gayi', 'Vishal & Shekhar & Arijit Singh', 'party', ['Nashe Si Chad Gayi']),
  track(1292298873, 'Bom Diggy', 'Zack Knight & Jasmin Walia', 'party', ['Bom Diggy Diggy']),
  track(1466957521, 'Aankh Marey', 'Neha Kakkar, Mika Singh & Kumar Sanu', 'party', ['Aankh Maare', 'Ankh Marey']),
  track(1478998926, 'Ghungroo', 'Arijit Singh, Shilpa Rao & Vishal & Shekhar', 'party'),
  track(486377559, 'Chikni Chameli', 'Shreya Ghoshal', 'party'),
  track(1116839791, 'Fevicol Se', 'Mamta Sharma & Wajid', 'party'),
  track(1123346653, 'Munni Badnaam', 'Mamta Sharma & Aishwarya Nigam', 'party', ['Munni Badnaam Hui']),
  track(1842065696, 'Malhari', 'Vishal Dadlani', 'party'),
  track(1481956482, 'Jai Jai Shivshankar', 'Vishal & Shekhar, Vishal Dadlani & Benny Dayal', 'party'),
  track(1434394473, 'Kamariya', 'Darshan Raval, Lijo George & DJ Chetas', 'party'),
  track(887456974, 'Saturday Saturday', 'Badshah, Indeep Bakshi & Akriti Kakkar', 'party'),
  track(1071079631, 'Dard-E-Disco', 'Sukhwinder Singh & Vishal & Shekhar', 'party', ['Dard E Disco']),
  track(1658280809, 'Besharam Rang', 'Vishal & Shekhar, Shilpa Rao & Caralisa Monteiro', 'party'),
  track(1169015786, 'The Breakup Song', 'Pritam, Arijit Singh, Badshah & Jonita Gandhi', 'party', ['Breakup Song']),
  track(1169015787, 'Cutiepie', 'Pritam, Pardeep Singh Sran & Nakash Aziz', 'party', ['Cutie Pie']),
  track(1696969405, 'What Jhumka', 'Pritam, Arijit Singh & Jonita Gandhi', 'party', ['What Jhumka?']),
  track(1759100524, 'Aaj Ki Raat', 'Madhubanti Bagchi, Divya Kumar & Sachin-Jigar', 'party'),
  track(1562303433, 'Zoobi Doobi', 'Sonu Nigam & Shreya Ghoshal', 'party'),
  track(1659644978, 'Jhoome Jo Pathaan', 'Vishal & Shekhar, Arijit Singh & Sukriti Kakar', 'party'),
  track(1443458534, 'Pal Pal Dil Ke Paas', 'Kishore Kumar', 'classic'),
  track(1340749968, 'Pehla Nasha', 'Udit Narayan & Sadhana Sargam', 'classic'),
  track(1352484512, 'Tujhe Dekha To', 'Lata Mangeshkar & Kumar Sanu', 'classic', ['Tujhe Dekha Toh']),
  track(673539855, 'Kajra Re', 'Alisha Chinai, Javed Ali & Shankar Mahadevan', 'classic'),
  track(305752291, 'Mitwa', 'Shankar Ehsaan Loy, Shafqat Amanat Ali & Shankar Mahadevan', 'classic'),
  track(673576188, 'Chand Sifarish', 'Kailash Kher & Shaan', 'classic'),
  track(1390183145, 'Lag Ja Gale', 'Sanam', 'classic'),
  track(1338718015, 'Mere Sapno Ki Rani', 'Kishore Kumar', 'classic'),
  track(1443485685, 'Yeh Dosti', 'Kishore Kumar & Manna Dey', 'classic', ['Yeh Dosti Hum Nahin']),
  track(1337327963, 'Khaike Paan Banaras Wala', 'Kishore Kumar', 'classic', ['Khaike Paan']),
  track(1338708210, 'Om Shanti Om', 'Kishore Kumar', 'classic'),
  track(1128665304, 'Tip Tip Barsa Paani', 'Alka Yagnik & Udit Narayan', 'classic', ['Tip Tip Barsa Pani']),
  track(1131692110, 'Arziyan', 'Javed Ali & Kailash Kher', 'sufi'),
  track(327458459, 'Iktara', 'Amit Trivedi & Kavita Seth', 'sufi'),
  track(1537961313, 'Khwaja Mere Khwaja', 'A.R. Rahman', 'sufi'),
  track(1340774328, 'Maula Mere Maula', 'Roop Kumar Rathod', 'sufi'),
  track(660158693, 'O Rangrez', 'Shankar Ehsaan Loy, Shreya Ghoshal & Javed Bashir', 'sufi'),
  track(1123241928, 'Nadaan Parinde', 'A.R. Rahman & Mohit Chauhan', 'sufi', ['Nadan Parinde']),
  track(1071855805, 'Bhar Do Jholi Meri', 'Pritam & Adnan Sami', 'sufi', ['Bhar Do Jholi']),
  track(1798501074, 'Tajdar-E-Haram', 'Atif Aslam', 'sufi', ['Tajdar E Haram']),
  track(1638680267, 'Deva Deva', 'Pritam, Arijit Singh & Jonita Gandhi', 'sufi'),
]

function toSong(entry: Entry): Song {
  return entry.aliases
    ? { trackId: entry.trackId, title: entry.title, artist: entry.artist, aliases: entry.aliases }
    : { trackId: entry.trackId, title: entry.title, artist: entry.artist }
}

function playlist(id: string, name: string, description: string, lane?: Lane): Playlist {
  const songs = entries.filter((entry) => lane === undefined || entry.lane === lane).map(toSong)
  return { id, name, description, storefront: 'in', songs }
}

export const hindi = playlist('hindi', 'Hindi mix', 'Film songs, mixed.')
export const hindiRomance = playlist('hindi-romance', 'Hindi romance', 'Love songs.', 'romance')
export const hindiParty = playlist('hindi-party', 'Hindi party', 'Dance songs.', 'party')
export const hindiClassics = playlist('hindi-classics', 'Hindi classics', 'Older film songs.', 'classic')
export const hindiSufi = playlist('hindi-sufi', 'Hindi sufi', 'Sufi and devotional songs.', 'sufi')
