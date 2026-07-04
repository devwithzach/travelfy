import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Search, Copy, Check, X } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import { useTrip } from '@/contexts/TripContext'
import { cn } from '@/utils/cn'

type Dialect = 'tagalog' | 'bisaya' | 'ilocano' | 'kapampangan' | 'waray' | 'hiligaynon'
type IntlLanguage = 'japanese' | 'korean' | 'thai' | 'mandarin' | 'spanish' | 'french' | 'indonesian' | 'vietnamese' | 'arabic'
type Category = 'greetings' | 'emergency' | 'food' | 'transport' | 'shopping' | 'directions' | 'numbers' | 'common'

interface Phrase {
  english: string
  phrase: string
  pronunciation: string
  category: Category
}

const DIALECTS: { id: Dialect; label: string; region: string; emoji: string }[] = [
  { id: 'tagalog',     label: 'Tagalog',     region: 'Metro Manila, Luzon',   emoji: '🏙️' },
  { id: 'bisaya',      label: 'Bisaya',       region: 'Cebu, Bohol, Mindanao', emoji: '🌊' },
  { id: 'ilocano',     label: 'Ilocano',      region: 'Ilocos, N. Luzon',      emoji: '⛵' },
  { id: 'kapampangan', label: 'Kapampangan',  region: 'Pampanga, Clark',        emoji: '🌋' },
  { id: 'waray',       label: 'Waray',        region: 'Leyte, Samar',           emoji: '🌴' },
  { id: 'hiligaynon',  label: 'Hiligaynon',   region: 'Iloilo, Bacolod',        emoji: '🎶' },
]

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'greetings',  label: 'Greetings',   emoji: '👋' },
  { id: 'common',     label: 'Common',      emoji: '💬' },
  { id: 'emergency',  label: 'Emergency',   emoji: '🚨' },
  { id: 'food',       label: 'Food',        emoji: '🍚' },
  { id: 'transport',  label: 'Transport',   emoji: '🚌' },
  { id: 'directions', label: 'Directions',  emoji: '🗺️' },
  { id: 'shopping',   label: 'Shopping',    emoji: '🛒' },
  { id: 'numbers',    label: 'Numbers',     emoji: '🔢' },
]

const PHRASES: Record<Dialect, Phrase[]> = {
  tagalog: [
    // Greetings
    { english: 'Hello / Hi',           phrase: 'Kumusta',                     pronunciation: 'koo-MUS-tah',           category: 'greetings' },
    { english: 'Good morning',         phrase: 'Magandang umaga',             pronunciation: 'ma-GAN-dang oo-MA-ga',  category: 'greetings' },
    { english: 'Good afternoon',       phrase: 'Magandang hapon',             pronunciation: 'ma-GAN-dang HA-pon',    category: 'greetings' },
    { english: 'Good evening',         phrase: 'Magandang gabi',              pronunciation: 'ma-GAN-dang GA-bee',    category: 'greetings' },
    { english: 'Thank you',            phrase: 'Salamat',                     pronunciation: 'sa-LA-mat',             category: 'greetings' },
    { english: 'You\'re welcome',      phrase: 'Walang anuman',               pronunciation: 'wa-LANG a-NOO-man',     category: 'greetings' },
    { english: 'Goodbye',              phrase: 'Paalam',                      pronunciation: 'pa-A-lam',              category: 'greetings' },
    // Common
    { english: 'Yes',                  phrase: 'Oo',                          pronunciation: 'OH-oh',                 category: 'common' },
    { english: 'No',                   phrase: 'Hindi',                       pronunciation: 'HIN-dee',               category: 'common' },
    { english: 'Please',               phrase: 'Pakiusap',                    pronunciation: 'pa-kee-OO-sap',         category: 'common' },
    { english: 'Sorry / Excuse me',    phrase: 'Pasensya na / Excuse me',     pronunciation: 'pa-SEN-sha na',         category: 'common' },
    { english: 'I don\'t understand',  phrase: 'Hindi ko maintindihan',       pronunciation: 'HIN-dee ko ma-in-tin-DEE-han', category: 'common' },
    { english: 'Do you speak English?',phrase: 'Marunong ka bang mag-Ingles?',pronunciation: 'ma-ROO-nong ka bang mag-ING-gles', category: 'common' },
    { english: 'How much?',            phrase: 'Magkano?',                    pronunciation: 'mag-KA-no',             category: 'common' },
    { english: 'Where is...?',         phrase: 'Nasaan ang...?',              pronunciation: 'na-SA-an ang',          category: 'common' },
    // Emergency
    { english: 'Help!',                phrase: 'Saklolo! / Tulong!',          pronunciation: 'sak-LO-lo / TOO-long',  category: 'emergency' },
    { english: 'Call the police!',     phrase: 'Tawagan ang pulis!',          pronunciation: 'ta-WA-gan ang POO-lis', category: 'emergency' },
    { english: 'I need a doctor',      phrase: 'Kailangan ko ng doktor',      pronunciation: 'ka-ee-LA-ngan ko nang DOK-tor', category: 'emergency' },
    { english: 'Hospital',             phrase: 'Ospital',                     pronunciation: 'os-PEE-tal',            category: 'emergency' },
    { english: 'I\'m lost',            phrase: 'Nawawala ako',                pronunciation: 'na-wa-WA-la AH-ko',     category: 'emergency' },
    { english: 'Thief!',               phrase: 'Magnanakaw!',                 pronunciation: 'mag-na-NA-kaw',         category: 'emergency' },
    // Food
    { english: 'I\'m hungry',          phrase: 'Gutom na ako',                pronunciation: 'GOO-tom na AH-ko',      category: 'food' },
    { english: 'Water please',         phrase: 'Pakibigay ng tubig',          pronunciation: 'pa-kee-BEE-gay nang TOO-big', category: 'food' },
    { english: 'The bill please',      phrase: 'Pakibigay ng bill',           pronunciation: 'pa-kee-BEE-gay nang bil', category: 'food' },
    { english: 'Delicious!',           phrase: 'Masarap!',                    pronunciation: 'ma-sa-RAP',             category: 'food' },
    { english: 'No pork / no beef',    phrase: 'Wala baboy / wala baka',      pronunciation: 'WA-la BA-boy / WA-la BA-ka', category: 'food' },
    { english: 'Rice',                 phrase: 'Kanin / Bigas',               pronunciation: 'KA-nin / BEE-gas',      category: 'food' },
    // Transport
    { english: 'Where is the jeepney?',phrase: 'Nasaan ang jeepney?',         pronunciation: 'na-SA-an ang JEEP-nee', category: 'transport' },
    { english: 'Stop here please',     phrase: 'Para po dito',                pronunciation: 'PA-ra po DEE-to',       category: 'transport' },
    { english: 'How much to...?',      phrase: 'Magkano papunta sa...?',      pronunciation: 'mag-KA-no pa-PUN-ta sa', category: 'transport' },
    { english: 'Take me to...',        phrase: 'Dalhin mo ako sa...',         pronunciation: 'DAL-hin mo AH-ko sa',   category: 'transport' },
    { english: 'Airport',              phrase: 'Paliparan',                   pronunciation: 'pa-lee-PA-ran',         category: 'transport' },
    { english: 'Bus terminal',         phrase: 'Terminal ng bus',             pronunciation: 'ter-mi-NAL nang bus',   category: 'transport' },
    // Directions
    { english: 'Left',                 phrase: 'Kaliwa',                      pronunciation: 'ka-LEE-wa',             category: 'directions' },
    { english: 'Right',                phrase: 'Kanan',                       pronunciation: 'KA-nan',                category: 'directions' },
    { english: 'Straight ahead',       phrase: 'Diretso',                     pronunciation: 'dee-RET-so',            category: 'directions' },
    { english: 'Near / Far',           phrase: 'Malapit / Malayo',            pronunciation: 'ma-LA-pit / ma-LA-yo',  category: 'directions' },
    // Shopping
    { english: 'Too expensive',        phrase: 'Mahal na mahal',              pronunciation: 'ma-HAL na ma-HAL',      category: 'shopping' },
    { english: 'Can you lower the price?', phrase: 'Pwede pa bang bawasan?',  pronunciation: 'PWEH-deh pa bang ba-WA-san', category: 'shopping' },
    { english: 'I\'m just looking',    phrase: 'Tinitingnan ko lang',         pronunciation: 'tee-nee-TING-nan ko lang', category: 'shopping' },
    // Numbers
    { english: 'One',   phrase: 'Isa',    pronunciation: 'EE-sa',   category: 'numbers' },
    { english: 'Two',   phrase: 'Dalawa', pronunciation: 'da-LA-wa', category: 'numbers' },
    { english: 'Three', phrase: 'Tatlo',  pronunciation: 'TAT-lo',  category: 'numbers' },
    { english: 'Four',  phrase: 'Apat',   pronunciation: 'A-pat',   category: 'numbers' },
    { english: 'Five',  phrase: 'Lima',   pronunciation: 'LEE-ma',  category: 'numbers' },
    { english: 'Ten',   phrase: 'Sampu',  pronunciation: 'SAM-poo', category: 'numbers' },
    { english: 'Hundred', phrase: 'Daan', pronunciation: 'da-AN',   category: 'numbers' },
  ],
  bisaya: [
    { english: 'Hello / Hi',           phrase: 'Kumusta',                     pronunciation: 'koo-MUS-tah',           category: 'greetings' },
    { english: 'Good morning',         phrase: 'Maayong buntag',              pronunciation: 'ma-AY-ong BOON-tag',    category: 'greetings' },
    { english: 'Good afternoon',       phrase: 'Maayong hapon',               pronunciation: 'ma-AY-ong HA-pon',      category: 'greetings' },
    { english: 'Good evening',         phrase: 'Maayong gabii',               pronunciation: 'ma-AY-ong ga-BEE',      category: 'greetings' },
    { english: 'Thank you',            phrase: 'Salamat',                     pronunciation: 'sa-LA-mat',             category: 'greetings' },
    { english: 'You\'re welcome',      phrase: 'Walay sapayan',               pronunciation: 'wa-LAY sa-PA-yan',      category: 'greetings' },
    { english: 'Goodbye',              phrase: 'Babay / Adto na ko',          pronunciation: 'BA-bye / AD-to na ko',  category: 'greetings' },
    { english: 'Yes',                  phrase: 'Oo',                          pronunciation: 'OH-oh',                 category: 'common' },
    { english: 'No',                   phrase: 'Dili',                        pronunciation: 'DEE-lee',               category: 'common' },
    { english: 'Please',               phrase: 'Palihug',                     pronunciation: 'pa-LEE-hug',            category: 'common' },
    { english: 'Sorry / Excuse me',    phrase: 'Pasaylo / Sorry',             pronunciation: 'pa-SAY-lo',             category: 'common' },
    { english: 'I don\'t understand',  phrase: 'Wala ko kasabot',             pronunciation: 'WA-la ko ka-SA-bot',    category: 'common' },
    { english: 'How much?',            phrase: 'Pila man?',                   pronunciation: 'PEE-la man',            category: 'common' },
    { english: 'Where is...?',         phrase: 'Asa ang...?',                 pronunciation: 'A-sa ang',              category: 'common' },
    { english: 'Help!',                phrase: 'Tabang! / Sabot!',            pronunciation: 'TA-bang / SA-bot',      category: 'emergency' },
    { english: 'Call the police!',     phrase: 'Tawaga ang pulis!',           pronunciation: 'ta-WA-ga ang POO-lis',  category: 'emergency' },
    { english: 'I need a doctor',      phrase: 'Nanginahanglan ko og doktor', pronunciation: 'nang-ee-na-HANG-lan ko og DOK-tor', category: 'emergency' },
    { english: 'Hospital',             phrase: 'Ospital',                     pronunciation: 'os-PEE-tal',            category: 'emergency' },
    { english: 'I\'m lost',            phrase: 'Nawala ko',                   pronunciation: 'na-WA-la ko',           category: 'emergency' },
    { english: 'I\'m hungry',          phrase: 'Gigutom na ko',               pronunciation: 'gee-GOO-tom na ko',     category: 'food' },
    { english: 'Water please',         phrase: 'Palihug og tubig',            pronunciation: 'pa-LEE-hug og TOO-big', category: 'food' },
    { english: 'The bill please',      phrase: 'Palihug og bill',             pronunciation: 'pa-LEE-hug og bil',     category: 'food' },
    { english: 'Delicious!',           phrase: 'Lami kaayo!',                 pronunciation: 'LA-mee ka-A-yo',        category: 'food' },
    { english: 'Rice',                 phrase: 'Kan-on / Bugas',              pronunciation: 'ka-NON / BOO-gas',      category: 'food' },
    { english: 'Stop here please',     phrase: 'Para diri palihug',           pronunciation: 'PA-ra DEE-ree pa-LEE-hug', category: 'transport' },
    { english: 'How much to...?',      phrase: 'Pila ang papunta sa...?',     pronunciation: 'PEE-la ang pa-PUN-ta sa', category: 'transport' },
    { english: 'Airport',              phrase: 'Paliparan',                   pronunciation: 'pa-lee-PA-ran',         category: 'transport' },
    { english: 'Left',                 phrase: 'Wala',                        pronunciation: 'WA-la',                 category: 'directions' },
    { english: 'Right',                phrase: 'Tuo',                         pronunciation: 'TOO-oh',                category: 'directions' },
    { english: 'Straight ahead',       phrase: 'Diretso',                     pronunciation: 'dee-RET-so',            category: 'directions' },
    { english: 'Near / Far',           phrase: 'Duol / Layo',                 pronunciation: 'DOO-ol / LA-yo',        category: 'directions' },
    { english: 'Too expensive',        phrase: 'Mahal kaayo',                 pronunciation: 'ma-HAL ka-A-yo',        category: 'shopping' },
    { english: 'Can you lower the price?', phrase: 'Pwede ba pakunhoran?',    pronunciation: 'PWEH-deh ba pa-koon-HO-ran', category: 'shopping' },
    { english: 'One',   phrase: 'Usa',   pronunciation: 'OO-sa',   category: 'numbers' },
    { english: 'Two',   phrase: 'Duha',  pronunciation: 'DOO-ha',  category: 'numbers' },
    { english: 'Three', phrase: 'Tulo',  pronunciation: 'TOO-lo',  category: 'numbers' },
    { english: 'Four',  phrase: 'Upat',  pronunciation: 'OO-pat',  category: 'numbers' },
    { english: 'Five',  phrase: 'Lima',  pronunciation: 'LEE-ma',  category: 'numbers' },
    { english: 'Ten',   phrase: 'Napulo',pronunciation: 'na-POO-lo',category: 'numbers' },
  ],
  ilocano: [
    { english: 'Hello / Hi',           phrase: 'Naimbag nga aldaw',           pronunciation: 'na-eem-BAG nga AL-daw', category: 'greetings' },
    { english: 'Good morning',         phrase: 'Naimbag nga bigat',           pronunciation: 'na-eem-BAG nga BEE-gat', category: 'greetings' },
    { english: 'Good afternoon',       phrase: 'Naimbag nga hapon',           pronunciation: 'na-eem-BAG nga HA-pon', category: 'greetings' },
    { english: 'Good evening',         phrase: 'Naimbag nga rabii',           pronunciation: 'na-eem-BAG nga ra-BEE', category: 'greetings' },
    { english: 'Thank you',            phrase: 'Agyamanak',                   pronunciation: 'ag-ya-MA-nak',          category: 'greetings' },
    { english: 'You\'re welcome',      phrase: 'Haan a bale',                 pronunciation: 'ha-AN a BA-leh',        category: 'greetings' },
    { english: 'Goodbye',              phrase: 'Agpakadaanka',                pronunciation: 'ag-pa-ka-da-AN-ka',     category: 'greetings' },
    { english: 'Yes',                  phrase: 'Wen',                         pronunciation: 'wen',                   category: 'common' },
    { english: 'No',                   phrase: 'Haan',                        pronunciation: 'ha-AN',                 category: 'common' },
    { english: 'Please',               phrase: 'Pangngaasim',                 pronunciation: 'pang-nga-A-sim',        category: 'common' },
    { english: 'Sorry',                phrase: 'Dispensarem',                 pronunciation: 'dis-pen-SA-rem',        category: 'common' },
    { english: 'How much?',            phrase: 'Mano?',                       pronunciation: 'MA-no',                 category: 'common' },
    { english: 'Where is...?',         phrase: 'Sadino ti...?',               pronunciation: 'sa-DEE-no ti',          category: 'common' },
    { english: 'I don\'t understand',  phrase: 'Saan ko maawatan',            pronunciation: 'sa-AN ko ma-a-WA-tan',  category: 'common' },
    { english: 'Help!',                phrase: 'Tulong! / Turay!',            pronunciation: 'TOO-long / TOO-ray',    category: 'emergency' },
    { english: 'Call the police!',     phrase: 'Awaganyo ti pulis!',          pronunciation: 'a-WA-gan-yo ti POO-lis', category: 'emergency' },
    { english: 'I need a doctor',      phrase: 'Masapulak ti doktor',         pronunciation: 'ma-sa-POO-lak ti DOK-tor', category: 'emergency' },
    { english: 'I\'m lost',            phrase: 'Nawarawarak',                 pronunciation: 'na-wa-ra-WA-rak',       category: 'emergency' },
    { english: 'I\'m hungry',          phrase: 'Nabisin ak',                  pronunciation: 'na-BEE-sin ak',         category: 'food' },
    { english: 'Delicious!',           phrase: 'Naimas!',                     pronunciation: 'na-EE-mas',             category: 'food' },
    { english: 'Water please',         phrase: 'Pangngaasim, bigyannak ti danum', pronunciation: 'big-YAN-nak ti DA-num', category: 'food' },
    { english: 'Stop here please',     phrase: 'Para ditoy',                  pronunciation: 'PA-ra dee-TOY',         category: 'transport' },
    { english: 'How much to...?',      phrase: 'Mano ti papanan to...?',      pronunciation: 'MA-no ti pa-PA-nan to', category: 'transport' },
    { english: 'Left',                 phrase: 'Kannigid',                    pronunciation: 'kan-NEE-gid',           category: 'directions' },
    { english: 'Right',                phrase: 'Kannawan',                    pronunciation: 'kan-NA-wan',            category: 'directions' },
    { english: 'Straight ahead',       phrase: 'Diretso',                     pronunciation: 'dee-RET-so',            category: 'directions' },
    { english: 'Too expensive',        phrase: 'Nangina unay',                pronunciation: 'na-NGEE-na OO-nay',     category: 'shopping' },
    { english: 'One',   phrase: 'Maysa',  pronunciation: 'MAY-sa',  category: 'numbers' },
    { english: 'Two',   phrase: 'Dua',    pronunciation: 'DOO-a',   category: 'numbers' },
    { english: 'Three', phrase: 'Tallo',  pronunciation: 'TAL-lo',  category: 'numbers' },
    { english: 'Four',  phrase: 'Uppat',  pronunciation: 'OOP-pat', category: 'numbers' },
    { english: 'Five',  phrase: 'Lima',   pronunciation: 'LEE-ma',  category: 'numbers' },
    { english: 'Ten',   phrase: 'Sangapulo', pronunciation: 'sa-nga-POO-lo', category: 'numbers' },
  ],
  kapampangan: [
    { english: 'Hello / Hi',           phrase: 'Komusta ka na?',              pronunciation: 'ko-MUS-ta ka na',       category: 'greetings' },
    { english: 'Good morning',         phrase: 'Mayap a abak',                pronunciation: 'MA-yap a A-bak',        category: 'greetings' },
    { english: 'Good afternoon',       phrase: 'Mayap a gatpanapun',          pronunciation: 'MA-yap a gat-pa-NA-pun', category: 'greetings' },
    { english: 'Good evening',         phrase: 'Mayap a bengi',               pronunciation: 'MA-yap a BEN-gee',      category: 'greetings' },
    { english: 'Thank you',            phrase: 'Salamat',                     pronunciation: 'sa-LA-mat',             category: 'greetings' },
    { english: 'You\'re welcome',      phrase: 'Eya kung anuman',             pronunciation: 'EH-ya kung a-NOO-man', category: 'greetings' },
    { english: 'Goodbye',              phrase: 'Ayo na',                      pronunciation: 'A-yo na',               category: 'greetings' },
    { english: 'Yes',                  phrase: 'Wa / Oo',                     pronunciation: 'wa / OH-oh',            category: 'common' },
    { english: 'No',                   phrase: 'Ali / Hindi',                 pronunciation: 'A-lee / HIN-dee',       category: 'common' },
    { english: 'Please',               phrase: 'Ngarud',                      pronunciation: 'nga-RUD',               category: 'common' },
    { english: 'Sorry',                phrase: 'Pasensya na',                 pronunciation: 'pa-SEN-sha na',         category: 'common' },
    { english: 'How much?',            phrase: 'Magkanu?',                    pronunciation: 'mag-KA-nu',             category: 'common' },
    { english: 'Where is...?',         phrase: 'Nokarin ing...?',             pronunciation: 'no-KA-rin ing',         category: 'common' },
    { english: 'Help!',                phrase: 'Saklolo! / Abigan me!',       pronunciation: 'sak-LO-lo / a-BEE-gan me', category: 'emergency' },
    { english: 'I need a doctor',      phrase: 'Kailangan ku ng doktor',      pronunciation: 'ka-ee-LA-ngan ku nang DOK-tor', category: 'emergency' },
    { english: 'I\'m hungry',          phrase: 'Gutom na ku',                 pronunciation: 'GOO-tom na ku',         category: 'food' },
    { english: 'Delicious!',           phrase: 'Masarap!',                    pronunciation: 'ma-sa-RAP',             category: 'food' },
    { english: 'Water please',         phrase: 'Pakibgie ing danum',          pronunciation: 'pa-kee-BGEE ing DA-num', category: 'food' },
    { english: 'Stop here please',     phrase: 'Para deti',                   pronunciation: 'PA-ra DEH-tee',         category: 'transport' },
    { english: 'How much to...?',      phrase: 'Magkanu papunta king...?',    pronunciation: 'mag-KA-nu pa-PUN-ta king', category: 'transport' },
    { english: 'Left',                 phrase: 'Abay / Kaliwa',               pronunciation: 'A-bye / ka-LEE-wa',     category: 'directions' },
    { english: 'Right',                phrase: 'Wanan / Kanan',               pronunciation: 'WA-nan / KA-nan',       category: 'directions' },
    { english: 'Too expensive',        phrase: 'Matas ya ing presyo',         pronunciation: 'MA-tas ya ing PRES-yo', category: 'shopping' },
    { english: 'One',   phrase: 'Metung', pronunciation: 'MEH-tung', category: 'numbers' },
    { english: 'Two',   phrase: 'Adua',   pronunciation: 'a-DOO-a',  category: 'numbers' },
    { english: 'Three', phrase: 'Atlu',   pronunciation: 'AT-lu',    category: 'numbers' },
    { english: 'Four',  phrase: 'Apat',   pronunciation: 'A-pat',    category: 'numbers' },
    { english: 'Five',  phrase: 'Lima',   pronunciation: 'LEE-ma',   category: 'numbers' },
    { english: 'Ten',   phrase: 'Apulu',  pronunciation: 'a-POO-lu', category: 'numbers' },
  ],
  waray: [
    { english: 'Hello / Hi',           phrase: 'Kumusta ka?',                 pronunciation: 'koo-MUS-ta ka',         category: 'greetings' },
    { english: 'Good morning',         phrase: 'Maupay nga aga',              pronunciation: 'ma-OO-pay nga A-ga',    category: 'greetings' },
    { english: 'Good afternoon',       phrase: 'Maupay nga kulop',            pronunciation: 'ma-OO-pay nga KOO-lop', category: 'greetings' },
    { english: 'Good evening',         phrase: 'Maupay nga gab-i',            pronunciation: 'ma-OO-pay nga ga-BEE',  category: 'greetings' },
    { english: 'Thank you',            phrase: 'Salamat',                     pronunciation: 'sa-LA-mat',             category: 'greetings' },
    { english: 'You\'re welcome',      phrase: 'Waray sapayan',               pronunciation: 'wa-RAY sa-PA-yan',      category: 'greetings' },
    { english: 'Goodbye',              phrase: 'Adto na ako',                 pronunciation: 'AD-to na A-ko',         category: 'greetings' },
    { english: 'Yes',                  phrase: 'Oo',                          pronunciation: 'OH-oh',                 category: 'common' },
    { english: 'No',                   phrase: 'Diri',                        pronunciation: 'DEE-ree',               category: 'common' },
    { english: 'Please',               phrase: 'Palihog',                     pronunciation: 'pa-LEE-hog',            category: 'common' },
    { english: 'Sorry',                phrase: 'Pasensya',                    pronunciation: 'pa-SEN-sha',            category: 'common' },
    { english: 'How much?',            phrase: 'Pira?',                       pronunciation: 'PEE-ra',                category: 'common' },
    { english: 'Where is...?',         phrase: 'Hain an...?',                 pronunciation: 'ha-IN an',              category: 'common' },
    { english: 'Help!',                phrase: 'Tabang!',                     pronunciation: 'TA-bang',               category: 'emergency' },
    { english: 'Call the police!',     phrase: 'Tawaga an pulis!',            pronunciation: 'ta-WA-ga an POO-lis',   category: 'emergency' },
    { english: 'I need a doctor',      phrase: 'Kinahanglan ko hin doktor',   pronunciation: 'kee-na-HANG-lan ko hin DOK-tor', category: 'emergency' },
    { english: 'I\'m lost',            phrase: 'Nawara ako',                  pronunciation: 'na-WA-ra A-ko',         category: 'emergency' },
    { english: 'I\'m hungry',          phrase: 'Gutom na ako',                pronunciation: 'GOO-tom na A-ko',       category: 'food' },
    { english: 'Delicious!',           phrase: 'Maupay!',                     pronunciation: 'ma-OO-pay',             category: 'food' },
    { english: 'Stop here please',     phrase: 'Para hini palihog',           pronunciation: 'PA-ra HEE-nee pa-LEE-hog', category: 'transport' },
    { english: 'Left',                 phrase: 'Wala',                        pronunciation: 'WA-la',                 category: 'directions' },
    { english: 'Right',                phrase: 'Tu-o',                        pronunciation: 'TOO-oh',                category: 'directions' },
    { english: 'Too expensive',        phrase: 'Mahal kaupay',                pronunciation: 'ma-HAL ka-OO-pay',      category: 'shopping' },
    { english: 'One',   phrase: 'Usa',   pronunciation: 'OO-sa',   category: 'numbers' },
    { english: 'Two',   phrase: 'Duha',  pronunciation: 'DOO-ha',  category: 'numbers' },
    { english: 'Three', phrase: 'Tulo',  pronunciation: 'TOO-lo',  category: 'numbers' },
    { english: 'Four',  phrase: 'Upat',  pronunciation: 'OO-pat',  category: 'numbers' },
    { english: 'Five',  phrase: 'Lima',  pronunciation: 'LEE-ma',  category: 'numbers' },
    { english: 'Ten',   phrase: 'Napulo',pronunciation: 'na-POO-lo',category: 'numbers' },
  ],
  hiligaynon: [
    { english: 'Hello / Hi',           phrase: 'Kamusta ka?',                 pronunciation: 'ka-MUS-ta ka',          category: 'greetings' },
    { english: 'Good morning',         phrase: 'Maayong aga',                 pronunciation: 'ma-AY-ong A-ga',        category: 'greetings' },
    { english: 'Good afternoon',       phrase: 'Maayong hapon',               pronunciation: 'ma-AY-ong HA-pon',      category: 'greetings' },
    { english: 'Good evening',         phrase: 'Maayong gab-i',               pronunciation: 'ma-AY-ong ga-BEE',      category: 'greetings' },
    { english: 'Thank you',            phrase: 'Salamat gid',                 pronunciation: 'sa-LA-mat gid',         category: 'greetings' },
    { english: 'You\'re welcome',      phrase: 'Wala sing sapayan',           pronunciation: 'WA-la sing sa-PA-yan',  category: 'greetings' },
    { english: 'Goodbye',              phrase: 'Asta sa liwan',               pronunciation: 'AS-ta sa LEE-wan',      category: 'greetings' },
    { english: 'Yes',                  phrase: 'Huo',                         pronunciation: 'HOO-oh',                category: 'common' },
    { english: 'No',                   phrase: 'Indi',                        pronunciation: 'IN-dee',                category: 'common' },
    { english: 'Please',               phrase: 'Palihog',                     pronunciation: 'pa-LEE-hog',            category: 'common' },
    { english: 'Sorry',                phrase: 'Pasensya',                    pronunciation: 'pa-SEN-sha',            category: 'common' },
    { english: 'How much?',            phrase: 'Pila?',                       pronunciation: 'PEE-la',                category: 'common' },
    { english: 'Where is...?',         phrase: 'Diin ang...?',                pronunciation: 'dee-IN ang',            category: 'common' },
    { english: 'Help!',                phrase: 'Bulig! / Tabang!',            pronunciation: 'BOO-lig / TA-bang',     category: 'emergency' },
    { english: 'Call the police!',     phrase: 'Tawga ang pulis!',            pronunciation: 'TAW-ga ang POO-lis',    category: 'emergency' },
    { english: 'I need a doctor',      phrase: 'Kinahanglan ko sang doktor',  pronunciation: 'kee-na-HANG-lan ko sang DOK-tor', category: 'emergency' },
    { english: 'I\'m lost',            phrase: 'Nawala ako',                  pronunciation: 'na-WA-la A-ko',         category: 'emergency' },
    { english: 'I\'m hungry',          phrase: 'Gutom na ako',                pronunciation: 'GOO-tom na A-ko',       category: 'food' },
    { english: 'Delicious!',           phrase: 'Malamlam!',                   pronunciation: 'ma-LAM-lam',            category: 'food' },
    { english: 'Stop here please',     phrase: 'Para diri palihog',           pronunciation: 'PA-ra DEE-ree pa-LEE-hog', category: 'transport' },
    { english: 'How much to...?',      phrase: 'Pila papunta sa...?',         pronunciation: 'PEE-la pa-PUN-ta sa',   category: 'transport' },
    { english: 'Left',                 phrase: 'Wala',                        pronunciation: 'WA-la',                 category: 'directions' },
    { english: 'Right',                phrase: 'Tu-o',                        pronunciation: 'TOO-oh',                category: 'directions' },
    { english: 'Straight ahead',       phrase: 'Diretso',                     pronunciation: 'dee-RET-so',            category: 'directions' },
    { english: 'Too expensive',        phrase: 'Mahal gid',                   pronunciation: 'ma-HAL gid',            category: 'shopping' },
    { english: 'Can you lower the price?', phrase: 'Pwede pa bawasan?',       pronunciation: 'PWEH-deh pa ba-WA-san', category: 'shopping' },
    { english: 'One',   phrase: 'Isa',    pronunciation: 'EE-sa',    category: 'numbers' },
    { english: 'Two',   phrase: 'Duha',   pronunciation: 'DOO-ha',   category: 'numbers' },
    { english: 'Three', phrase: 'Tatlo',  pronunciation: 'TAT-lo',   category: 'numbers' },
    { english: 'Four',  phrase: 'Apat',   pronunciation: 'A-pat',    category: 'numbers' },
    { english: 'Five',  phrase: 'Lima',   pronunciation: 'LEE-ma',   category: 'numbers' },
    { english: 'Ten',   phrase: 'Napulo', pronunciation: 'na-POO-lo',category: 'numbers' },
  ],
}

const INTL_LANGUAGES: { id: IntlLanguage; label: string; region: string; emoji: string }[] = [
  { id: 'japanese',   label: 'Japanese',   region: 'Japan',           emoji: '🇯🇵' },
  { id: 'korean',     label: 'Korean',     region: 'South Korea',     emoji: '🇰🇷' },
  { id: 'thai',       label: 'Thai',       region: 'Thailand',        emoji: '🇹🇭' },
  { id: 'mandarin',   label: 'Mandarin',   region: 'China, Taiwan, HK',emoji: '🇨🇳' },
  { id: 'spanish',    label: 'Spanish',    region: 'Spain, LatAm',    emoji: '🇪🇸' },
  { id: 'french',     label: 'French',     region: 'France, Europe',  emoji: '🇫🇷' },
  { id: 'indonesian', label: 'Indonesian', region: 'Indonesia, Bali', emoji: '🇮🇩' },
  { id: 'vietnamese', label: 'Vietnamese', region: 'Vietnam',         emoji: '🇻🇳' },
  { id: 'arabic',     label: 'Arabic',     region: 'UAE, Middle East',emoji: '🇦🇪' },
]

const INTL_PHRASES: Record<IntlLanguage, Phrase[]> = {
  japanese: [
    { english: 'Hello',               phrase: 'Konnichiwa (こんにちは)',    pronunciation: 'kon-NEE-chee-wah',    category: 'greetings' },
    { english: 'Good morning',        phrase: 'Ohayou gozaimasu (おはようございます)', pronunciation: 'oh-ha-YO go-ZAI-mas', category: 'greetings' },
    { english: 'Good evening',        phrase: 'Konbanwa (こんばんは)',       pronunciation: 'kon-BAN-wah',          category: 'greetings' },
    { english: 'Thank you',           phrase: 'Arigatou gozaimasu (ありがとうございます)', pronunciation: 'a-ree-GA-to go-ZAI-mas', category: 'greetings' },
    { english: 'Goodbye',             phrase: 'Sayounara (さようなら)',      pronunciation: 'sa-YO-na-ra',          category: 'greetings' },
    { english: 'Yes / No',            phrase: 'Hai / Iie (はい / いいえ)',  pronunciation: 'hai / ee-EH',          category: 'common' },
    { english: 'Please',              phrase: 'Onegaishimasu (おねがいします)', pronunciation: 'o-ne-GAI-shi-mas',  category: 'common' },
    { english: 'Sorry / Excuse me',   phrase: 'Sumimasen (すみません)',      pronunciation: 'su-mee-MA-sen',        category: 'common' },
    { english: 'I don\'t understand', phrase: 'Wakarimasen (わかりません)',  pronunciation: 'wa-ka-ree-MA-sen',     category: 'common' },
    { english: 'How much?',           phrase: 'Ikura desu ka? (いくらですか)', pronunciation: 'ee-KOO-ra des-KA',  category: 'common' },
    { english: 'Where is...?',        phrase: '...wa doko desu ka? (...はどこですか)', pronunciation: 'wa DOH-ko des-KA', category: 'common' },
    { english: 'Help!',               phrase: 'Tasukete! (たすけて)',        pronunciation: 'ta-su-KE-te',          category: 'emergency' },
    { english: 'Call the police!',    phrase: 'Keisatsu wo yonde! (警察を呼んで)', pronunciation: 'KAY-sa-tsu wo YON-de', category: 'emergency' },
    { english: 'I need a doctor',     phrase: 'Isha ga hitsuyou desu (医者が必要です)', pronunciation: 'EE-sha ga hit-SU-yo des', category: 'emergency' },
    { english: 'Delicious!',          phrase: 'Oishii! (おいしい)',          pronunciation: 'oh-EE-shee',           category: 'food' },
    { english: 'Water please',        phrase: 'Omizu kudasai (お水ください)', pronunciation: 'oh-MEE-zoo ku-DA-sai', category: 'food' },
    { english: 'The bill please',     phrase: 'Okaikei onegaishimasu (お会計おねがいします)', pronunciation: 'oh-KAI-kay o-ne-GAI-shi-mas', category: 'food' },
    { english: 'Train / Subway',      phrase: 'Densha / Chikatetsu (電車 / 地下鉄)', pronunciation: 'DEN-sha / chee-ka-TET-su', category: 'transport' },
    { english: 'Taxi',                phrase: 'Takushii (タクシー)',         pronunciation: 'ta-KU-shee',           category: 'transport' },
    { english: 'Left / Right',        phrase: 'Hidari / Migi (左 / 右)',    pronunciation: 'hee-DA-ree / MEE-gee',  category: 'directions' },
    { english: 'Straight ahead',      phrase: 'Massugu (まっすぐ)',          pronunciation: 'mas-SU-gu',            category: 'directions' },
    { english: 'Too expensive',       phrase: 'Takai desu (高いです)',       pronunciation: 'ta-KAI des',           category: 'shopping' },
    { english: 'One / Two / Three',   phrase: 'Ichi / Ni / San (一/二/三)', pronunciation: 'EE-chee / nee / san',  category: 'numbers' },
  ],
  korean: [
    { english: 'Hello',               phrase: 'Annyeonghaseyo (안녕하세요)',  pronunciation: 'an-NYONG-ha-se-yo',    category: 'greetings' },
    { english: 'Good morning',        phrase: 'Annyeong (안녕)',              pronunciation: 'an-NYONG',             category: 'greetings' },
    { english: 'Thank you',           phrase: 'Gamsahamnida (감사합니다)',    pronunciation: 'gam-SA-ham-nee-da',    category: 'greetings' },
    { english: 'You\'re welcome',     phrase: 'Cheonmaneyo (천만에요)',       pronunciation: 'chon-MAN-eh-yo',       category: 'greetings' },
    { english: 'Goodbye',             phrase: 'Annyeonghi gaseyo (안녕히 가세요)', pronunciation: 'an-NYONG-hee ga-SE-yo', category: 'greetings' },
    { english: 'Yes / No',            phrase: 'Ne / Aniyo (네 / 아니요)',    pronunciation: 'neh / a-NEE-yo',       category: 'common' },
    { english: 'Please',              phrase: 'Juseyo (주세요)',              pronunciation: 'ju-SE-yo',             category: 'common' },
    { english: 'Sorry',               phrase: 'Joesonghamnida (죄송합니다)', pronunciation: 'jweh-SONG-ham-nee-da', category: 'common' },
    { english: 'How much?',           phrase: 'Eolmayeyo? (얼마예요?)',      pronunciation: 'OL-ma-ye-yo',          category: 'common' },
    { english: 'Where is...?',        phrase: '...eodi isseoyo? (...어디 있어요?)', pronunciation: 'OH-dee ee-ssoh-yo', category: 'common' },
    { english: 'Help!',               phrase: 'Dowa juseyo! (도와주세요)',    pronunciation: 'DO-wa ju-SE-yo',       category: 'emergency' },
    { english: 'Call police!',        phrase: 'Gyeongchal bulleo juseyo! (경찰 불러주세요)', pronunciation: 'GYONG-chal bul-LO ju-SE-yo', category: 'emergency' },
    { english: 'I need a doctor',     phrase: 'Uisa ga piryohaeyo (의사가 필요해요)', pronunciation: 'EE-sa ga pil-YO-heh-yo', category: 'emergency' },
    { english: 'Delicious!',          phrase: 'Masisseoyo! (맛있어요)',       pronunciation: 'ma-SHEE-ssoh-yo',      category: 'food' },
    { english: 'Water please',        phrase: 'Mul juseyo (물 주세요)',       pronunciation: 'mul ju-SE-yo',         category: 'food' },
    { english: 'Bill please',         phrase: 'Gyesanseo juseyo (계산서 주세요)', pronunciation: 'GYE-san-soh ju-SE-yo', category: 'food' },
    { english: 'Subway / Bus',        phrase: 'Jihacheo / Beoseu (지하철 / 버스)', pronunciation: 'jee-ha-CHOL / BOH-seu', category: 'transport' },
    { english: 'Taxi',                phrase: 'Taeksi (택시)',               pronunciation: 'TAEK-shee',            category: 'transport' },
    { english: 'Left / Right',        phrase: 'Waejeok / Oreunjjok (왼쪽 / 오른쪽)', pronunciation: 'WEN-jjok / O-reun-jjok', category: 'directions' },
    { english: 'Too expensive',       phrase: 'Neomu bissayo (너무 비싸요)',  pronunciation: 'NO-mu bi-SSA-yo',      category: 'shopping' },
    { english: 'One / Two / Three',   phrase: 'Il / I / Sam (일 / 이 / 삼)', pronunciation: 'il / ee / sam',        category: 'numbers' },
  ],
  thai: [
    { english: 'Hello',               phrase: 'Sawasdee (สวัสดี)',           pronunciation: 'sa-WAT-dee',           category: 'greetings' },
    { english: 'Thank you',           phrase: 'Khop khun (ขอบคุณ)',          pronunciation: 'KHOP-khun',            category: 'greetings' },
    { english: 'You\'re welcome',     phrase: 'Yin dee (ยินดี)',              pronunciation: 'YIN-dee',              category: 'greetings' },
    { english: 'Goodbye',             phrase: 'Laa gorn (ลาก่อน)',           pronunciation: 'LAH-gon',              category: 'greetings' },
    { english: 'Yes / No',            phrase: 'Chai / Mai (ใช่ / ไม่)',      pronunciation: 'chai / mai',           category: 'common' },
    { english: 'Please',              phrase: 'Karuna (กรุณา)',               pronunciation: 'ka-RU-na',             category: 'common' },
    { english: 'Sorry',               phrase: 'Khaw thot (ขอโทษ)',           pronunciation: 'KHAW-tot',             category: 'common' },
    { english: 'How much?',           phrase: 'Tao rai? (เท่าไหร่)',          pronunciation: 'TAO-rai',              category: 'common' },
    { english: 'Where is...?',        phrase: '...yoo tee nai? (...อยู่ที่ไหน)', pronunciation: 'yoo TEE-nai',      category: 'common' },
    { english: 'Help!',               phrase: 'Chuay duay! (ช่วยด้วย)',       pronunciation: 'CHOO-ay duay',         category: 'emergency' },
    { english: 'Call police!',        phrase: 'Reak tam ruat! (เรียกตำรวจ)', pronunciation: 'REAK tam-RUAT',        category: 'emergency' },
    { english: 'I need a doctor',     phrase: 'Tong gaan mor (ต้องการหมอ)',  pronunciation: 'TONG-gaan mor',        category: 'emergency' },
    { english: 'Delicious!',          phrase: 'Aroy mak! (อร่อยมาก)',        pronunciation: 'a-ROY mak',            category: 'food' },
    { english: 'Water please',        phrase: 'Kho naam (ขอน้ำ)',             pronunciation: 'KHAW naam',            category: 'food' },
    { english: 'Bill please',         phrase: 'Kep ngoen duay (เก็บเงินด้วย)', pronunciation: 'KEPH-ngern duay',  category: 'food' },
    { english: 'Tuk-tuk / Taxi',      phrase: 'Tuk-tuk / Taek-see (ตุ๊กตุ๊ก / แท็กซี่)', pronunciation: 'TUK-tuk / TAEK-see', category: 'transport' },
    { english: 'Left / Right',        phrase: 'Saai / Kwaa (ซ้าย / ขวา)',   pronunciation: 'saai / kwaa',          category: 'directions' },
    { english: 'Too expensive',       phrase: 'Phaeng mak (แพงมาก)',         pronunciation: 'PHANG mak',            category: 'shopping' },
    { english: 'Can you discount?',   phrase: 'Lot raakha dai mai? (ลดราคาได้ไหม)', pronunciation: 'LOT raa-KHA dai mai', category: 'shopping' },
    { english: 'One / Two / Three',   phrase: 'Neung / Song / Sam (หนึ่ง / สอง / สาม)', pronunciation: 'NUENG / song / sam', category: 'numbers' },
  ],
  mandarin: [
    { english: 'Hello',               phrase: 'Nǐ hǎo (你好)',               pronunciation: 'nee HOW',              category: 'greetings' },
    { english: 'Good morning',        phrase: 'Zǎo shang hǎo (早上好)',      pronunciation: 'ZAO shang HOW',        category: 'greetings' },
    { english: 'Thank you',           phrase: 'Xièxiè (谢谢)',               pronunciation: 'SHYEH-shyeh',          category: 'greetings' },
    { english: 'You\'re welcome',     phrase: 'Bú kèqi (不客气)',             pronunciation: 'boo KUH-chee',         category: 'greetings' },
    { english: 'Goodbye',             phrase: 'Zàijiàn (再见)',               pronunciation: 'ZAI-jyen',             category: 'greetings' },
    { english: 'Yes / No',            phrase: 'Shì / Bù shì (是 / 不是)',    pronunciation: 'shir / boo shir',      category: 'common' },
    { english: 'Please',              phrase: 'Qǐng (请)',                    pronunciation: 'ching',                category: 'common' },
    { english: 'Sorry',               phrase: 'Duìbuqǐ (对不起)',             pronunciation: 'DWAY-boo-chee',        category: 'common' },
    { english: 'How much?',           phrase: 'Duōshǎo qián? (多少钱)',       pronunciation: 'dwo-SHAO chyen',       category: 'common' },
    { english: 'Where is...?',        phrase: '...zài nǎlǐ? (...在哪里)',    pronunciation: 'ZAI na-lee',           category: 'common' },
    { english: 'Help!',               phrase: 'Jiùmìng! (救命)',              pronunciation: 'JYO-ming',             category: 'emergency' },
    { english: 'Call police!',        phrase: 'Jiào jǐngchá! (叫警察)',       pronunciation: 'JYAO jing-CHA',        category: 'emergency' },
    { english: 'I need a doctor',     phrase: 'Wǒ xūyào yīshēng (我需要医生)', pronunciation: 'WOR shoo-YAO ee-SHUNG', category: 'emergency' },
    { english: 'Delicious!',          phrase: 'Hǎo chī! (好吃)',              pronunciation: 'how CHIR',             category: 'food' },
    { english: 'Water please',        phrase: 'Qǐng lái shuǐ (请来水)',       pronunciation: 'ching LY shway',       category: 'food' },
    { english: 'Bill please',         phrase: 'Mǎidān (买单)',                pronunciation: 'my-DAN',               category: 'food' },
    { english: 'Subway / Taxi',       phrase: 'Dìtiě / Chūzūchē (地铁 / 出租车)', pronunciation: 'dee-TYEH / choo-ZOO-chuh', category: 'transport' },
    { english: 'Left / Right',        phrase: 'Zuǒ / Yòu (左 / 右)',         pronunciation: 'zwoh / yo',            category: 'directions' },
    { english: 'Too expensive',       phrase: 'Tài guì le (太贵了)',          pronunciation: 'ty GWAY luh',          category: 'shopping' },
    { english: 'One / Two / Three',   phrase: 'Yī / Èr / Sān (一 / 二 / 三)', pronunciation: 'ee / ar / san',       category: 'numbers' },
  ],
  spanish: [
    { english: 'Hello',               phrase: 'Hola',                        pronunciation: 'OH-la',                category: 'greetings' },
    { english: 'Good morning',        phrase: 'Buenos días',                 pronunciation: 'BWEH-nos DEE-as',      category: 'greetings' },
    { english: 'Good evening',        phrase: 'Buenas noches',               pronunciation: 'BWEH-nas NO-ches',     category: 'greetings' },
    { english: 'Thank you',           phrase: 'Gracias',                     pronunciation: 'GRA-syas',             category: 'greetings' },
    { english: 'Goodbye',             phrase: 'Adiós / Hasta luego',         pronunciation: 'a-DYOS / AS-ta LWEH-go', category: 'greetings' },
    { english: 'Yes / No',            phrase: 'Sí / No',                     pronunciation: 'see / no',             category: 'common' },
    { english: 'Please',              phrase: 'Por favor',                   pronunciation: 'por fa-VOR',           category: 'common' },
    { english: 'Sorry / Excuse me',   phrase: 'Lo siento / Perdón',          pronunciation: 'lo SYEN-to / per-DON', category: 'common' },
    { english: 'How much?',           phrase: '¿Cuánto cuesta?',             pronunciation: 'KWAN-to KWES-ta',      category: 'common' },
    { english: 'Where is...?',        phrase: '¿Dónde está...?',             pronunciation: 'DON-de es-TA',         category: 'common' },
    { english: 'Help!',               phrase: '¡Socorro! / ¡Ayuda!',         pronunciation: 'so-KOR-ro / a-YU-da',  category: 'emergency' },
    { english: 'Call the police!',    phrase: '¡Llame a la policía!',        pronunciation: 'YA-me a la po-lee-SEE-a', category: 'emergency' },
    { english: 'I need a doctor',     phrase: 'Necesito un médico',          pronunciation: 'ne-se-SEE-to un MEH-dee-ko', category: 'emergency' },
    { english: 'Delicious!',          phrase: '¡Delicioso!',                 pronunciation: 'de-lee-SYOH-so',       category: 'food' },
    { english: 'Water please',        phrase: 'Agua por favor',              pronunciation: 'A-gwa por fa-VOR',     category: 'food' },
    { english: 'Bill please',         phrase: 'La cuenta por favor',         pronunciation: 'la KWEN-ta por fa-VOR', category: 'food' },
    { english: 'Left / Right',        phrase: 'Izquierda / Derecha',         pronunciation: 'iz-KYER-da / de-REH-cha', category: 'directions' },
    { english: 'Straight ahead',      phrase: 'Todo recto',                  pronunciation: 'TOH-do REK-to',        category: 'directions' },
    { english: 'Too expensive',       phrase: 'Es muy caro',                 pronunciation: 'es muy KA-ro',         category: 'shopping' },
    { english: 'One / Two / Three',   phrase: 'Uno / Dos / Tres',            pronunciation: 'OO-no / dos / tres',   category: 'numbers' },
  ],
  french: [
    { english: 'Hello',               phrase: 'Bonjour',                     pronunciation: 'bon-ZHOOR',            category: 'greetings' },
    { english: 'Good evening',        phrase: 'Bonsoir',                     pronunciation: 'bon-SWAAR',            category: 'greetings' },
    { english: 'Thank you',           phrase: 'Merci',                       pronunciation: 'mer-SEE',              category: 'greetings' },
    { english: 'You\'re welcome',     phrase: 'De rien',                     pronunciation: 'duh RYEN',             category: 'greetings' },
    { english: 'Goodbye',             phrase: 'Au revoir',                   pronunciation: 'oh ruh-VWAR',          category: 'greetings' },
    { english: 'Yes / No',            phrase: 'Oui / Non',                   pronunciation: 'wee / non',            category: 'common' },
    { english: 'Please',              phrase: 'S\'il vous plaît',            pronunciation: 'seel voo PLEH',        category: 'common' },
    { english: 'Sorry / Excuse me',   phrase: 'Pardon / Excusez-moi',        pronunciation: 'par-DON / ex-koo-ZAY mwa', category: 'common' },
    { english: 'How much?',           phrase: 'Combien ça coûte?',           pronunciation: 'kom-BYEN sa koot',     category: 'common' },
    { english: 'Where is...?',        phrase: 'Où est...?',                  pronunciation: 'oo eh',                category: 'common' },
    { english: 'Help!',               phrase: 'Au secours!',                 pronunciation: 'oh suh-KOOR',          category: 'emergency' },
    { english: 'Call the police!',    phrase: 'Appelez la police!',          pronunciation: 'ap-LAY la po-LEES',    category: 'emergency' },
    { english: 'I need a doctor',     phrase: 'J\'ai besoin d\'un médecin',  pronunciation: 'zhay buh-ZWAN dun med-SAN', category: 'emergency' },
    { english: 'Delicious!',          phrase: 'Délicieux!',                  pronunciation: 'deh-lee-SYUH',         category: 'food' },
    { english: 'Water please',        phrase: 'De l\'eau s\'il vous plaît',  pronunciation: 'duh lo seel voo PLEH', category: 'food' },
    { english: 'Bill please',         phrase: 'L\'addition s\'il vous plaît', pronunciation: 'la-dee-SYON seel voo PLEH', category: 'food' },
    { english: 'Metro / Taxi',        phrase: 'Métro / Taxi',                pronunciation: 'MEH-tro / tak-SEE',    category: 'transport' },
    { english: 'Left / Right',        phrase: 'Gauche / Droite',             pronunciation: 'gohsh / drwat',        category: 'directions' },
    { english: 'Too expensive',       phrase: 'C\'est trop cher',            pronunciation: 'say tro shair',        category: 'shopping' },
    { english: 'One / Two / Three',   phrase: 'Un / Deux / Trois',           pronunciation: 'un / duh / trwah',     category: 'numbers' },
  ],
  indonesian: [
    { english: 'Hello',               phrase: 'Halo / Selamat',              pronunciation: 'HA-lo / se-LA-mat',    category: 'greetings' },
    { english: 'Good morning',        phrase: 'Selamat pagi',                pronunciation: 'se-LA-mat PA-gee',     category: 'greetings' },
    { english: 'Good afternoon',      phrase: 'Selamat siang',               pronunciation: 'se-LA-mat SYANG',      category: 'greetings' },
    { english: 'Thank you',           phrase: 'Terima kasih',                pronunciation: 'te-REE-ma KA-see',     category: 'greetings' },
    { english: 'You\'re welcome',     phrase: 'Sama-sama',                   pronunciation: 'SA-ma SA-ma',          category: 'greetings' },
    { english: 'Goodbye',             phrase: 'Selamat tinggal',             pronunciation: 'se-LA-mat TING-gal',   category: 'greetings' },
    { english: 'Yes / No',            phrase: 'Ya / Tidak',                  pronunciation: 'ya / TEE-dak',         category: 'common' },
    { english: 'Please',              phrase: 'Tolong',                      pronunciation: 'TOH-long',             category: 'common' },
    { english: 'Sorry',               phrase: 'Maaf',                        pronunciation: 'ma-AF',                category: 'common' },
    { english: 'How much?',           phrase: 'Berapa harganya?',            pronunciation: 'be-RA-pa har-GA-nya',  category: 'common' },
    { english: 'Where is...?',        phrase: 'Di mana...?',                 pronunciation: 'dee MA-na',            category: 'common' },
    { english: 'Help!',               phrase: 'Tolong!',                     pronunciation: 'TOH-long',             category: 'emergency' },
    { english: 'Call police!',        phrase: 'Panggil polisi!',             pronunciation: 'PANG-gil po-LEE-see',  category: 'emergency' },
    { english: 'I need a doctor',     phrase: 'Saya butuh dokter',           pronunciation: 'SA-ya BOO-tuh DOK-ter', category: 'emergency' },
    { english: 'Delicious!',          phrase: 'Enak!',                       pronunciation: 'EH-nak',               category: 'food' },
    { english: 'Water please',        phrase: 'Air putih tolong',            pronunciation: 'a-EER POO-tih TOH-long', category: 'food' },
    { english: 'Bill please',         phrase: 'Minta bon/nota',              pronunciation: 'MIN-ta bon',           category: 'food' },
    { english: 'Ojek / Taxi / Gojek', phrase: 'Ojek / Taksi / Gojek',       pronunciation: 'OH-jek / TAK-see',     category: 'transport' },
    { english: 'Left / Right',        phrase: 'Kiri / Kanan',                pronunciation: 'KEE-ree / KA-nan',     category: 'directions' },
    { english: 'Too expensive',       phrase: 'Terlalu mahal',               pronunciation: 'ter-LA-lu ma-HAL',     category: 'shopping' },
    { english: 'One / Two / Three',   phrase: 'Satu / Dua / Tiga',          pronunciation: 'SA-tu / DOO-a / TEE-ga', category: 'numbers' },
  ],
  vietnamese: [
    { english: 'Hello',               phrase: 'Xin chào',                    pronunciation: 'sin CHOW',             category: 'greetings' },
    { english: 'Good morning',        phrase: 'Chào buổi sáng',              pronunciation: 'CHOW bwoy SANG',       category: 'greetings' },
    { english: 'Thank you',           phrase: 'Cảm ơn',                      pronunciation: 'GAM un',               category: 'greetings' },
    { english: 'You\'re welcome',     phrase: 'Không có gì',                 pronunciation: 'khong KO zee',         category: 'greetings' },
    { english: 'Goodbye',             phrase: 'Tạm biệt',                    pronunciation: 'tam BYet',             category: 'greetings' },
    { english: 'Yes / No',            phrase: 'Vâng / Không',                pronunciation: 'vang / khong',         category: 'common' },
    { english: 'Please',              phrase: 'Làm ơn',                      pronunciation: 'lam UN',               category: 'common' },
    { english: 'Sorry',               phrase: 'Xin lỗi',                     pronunciation: 'sin LOY',              category: 'common' },
    { english: 'How much?',           phrase: 'Bao nhiêu tiền?',             pronunciation: 'bao NYEW tyen',        category: 'common' },
    { english: 'Where is...?',        phrase: '...ở đâu?',                   pronunciation: 'uh DOH',               category: 'common' },
    { english: 'Help!',               phrase: 'Cứu tôi! / Giúp tôi!',       pronunciation: 'KU toy / ZUP toy',     category: 'emergency' },
    { english: 'Call police!',        phrase: 'Gọi cảnh sát!',               pronunciation: 'GOY GANG sat',         category: 'emergency' },
    { english: 'I need a doctor',     phrase: 'Tôi cần bác sĩ',              pronunciation: 'toy KAN bak SEE',      category: 'emergency' },
    { english: 'Delicious!',          phrase: 'Ngon lắm!',                   pronunciation: 'ngon LAM', category: 'food' },
    { english: 'Water please',        phrase: 'Cho tôi nước',                pronunciation: 'cho toy NOOK',         category: 'food' },
    { english: 'Bill please',         phrase: 'Tính tiền',                   pronunciation: 'TING tyen',            category: 'food' },
    { english: 'Grab / Taxi',         phrase: 'Xe Grab / Taxi',              pronunciation: 'se GRAB / TAK-see',    category: 'transport' },
    { english: 'Left / Right',        phrase: 'Trái / Phải',                 pronunciation: 'chai / fai',           category: 'directions' },
    { english: 'Too expensive',       phrase: 'Đắt quá',                     pronunciation: 'DAT kwa',              category: 'shopping' },
    { english: 'One / Two / Three',   phrase: 'Một / Hai / Ba',              pronunciation: 'mote / hai / ba',      category: 'numbers' },
  ],
  arabic: [
    { english: 'Hello / Peace be upon you', phrase: 'As-salamu alaykum (السلام عليكم)', pronunciation: 'as-SA-lam-u a-LAY-kum', category: 'greetings' },
    { english: 'Hello (informal)',    phrase: 'Marhaba (مرحبا)',              pronunciation: 'MAR-ha-ba',            category: 'greetings' },
    { english: 'Good morning',       phrase: 'Sabah al-khayr (صباح الخير)',  pronunciation: 'SA-bah al-KHAYR',     category: 'greetings' },
    { english: 'Thank you',          phrase: 'Shukran (شكرا)',               pronunciation: 'SHUK-ran',             category: 'greetings' },
    { english: 'Goodbye',            phrase: 'Ma\'a as-salamah (مع السلامة)', pronunciation: 'MA-a as-SA-la-ma',    category: 'greetings' },
    { english: 'Yes / No',           phrase: 'Na\'am / La (نعم / لا)',        pronunciation: 'na-AM / la',           category: 'common' },
    { english: 'Please',             phrase: 'Min fadlak (من فضلك)',          pronunciation: 'min FAD-lak',          category: 'common' },
    { english: 'Sorry / Excuse me',  phrase: 'Aasif / Afwan (آسف / عفوا)',   pronunciation: 'AA-sif / AF-wan',      category: 'common' },
    { english: 'How much?',          phrase: 'Bikam? (بكم)',                  pronunciation: 'bi-KAM',               category: 'common' },
    { english: 'Where is...?',       phrase: 'Ayna...? (أين)',               pronunciation: 'AY-na',                category: 'common' },
    { english: 'Help!',              phrase: 'Musaa\'ada! (مساعدة)',          pronunciation: 'mu-SA-a-da',           category: 'emergency' },
    { english: 'Call police!',       phrase: 'Utrub ash-shurtah! (اتصل بالشرطة)', pronunciation: 'UT-rub ash-SHUR-ta', category: 'emergency' },
    { english: 'I need a doctor',    phrase: 'Ahtaj tabib (أحتاج طبيب)',     pronunciation: 'ah-TAJ ta-BEEB',       category: 'emergency' },
    { english: 'Delicious!',         phrase: 'Ladhidh! (لذيذ)',              pronunciation: 'la-DHEETH',            category: 'food' },
    { english: 'Water please',       phrase: 'Maa\' min fadlak (ماء من فضلك)', pronunciation: 'MA-a min FAD-lak',  category: 'food' },
    { english: 'Bill please',        phrase: 'Al-fattura min fadlak (الفاتورة)', pronunciation: 'al-fa-TOO-ra min FAD-lak', category: 'food' },
    { english: 'Taxi / Metro',       phrase: 'Taksi / Metro (تاكسي / مترو)', pronunciation: 'TAK-see / MET-ro',    category: 'transport' },
    { english: 'Left / Right',       phrase: 'Yasaar / Yameen (يسار / يمين)', pronunciation: 'ya-SAR / ya-MEEN',   category: 'directions' },
    { english: 'Too expensive',      phrase: 'Ghali jiddan (غالي جداً)',     pronunciation: 'GHA-lee JID-dan',      category: 'shopping' },
    { english: 'One / Two / Three',  phrase: 'Wahid / Ithnaan / Thalatha (١ / ٢ / ٣)', pronunciation: 'WA-hid / ith-NAAN / tha-LA-tha', category: 'numbers' },
  ],
}

export default function Phrasebook() {
  const { trip } = useTrip()
  const isDomestic = trip.tripInfo.tripType === 'domestic'

  const [mode, setMode] = useState<'ph' | 'intl'>(isDomestic ? 'ph' : 'intl')
  const [dialect, setDialect] = useState<Dialect>('tagalog')
  const [intlLang, setIntlLang] = useState<IntlLanguage>('japanese')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const phrases = useMemo(() => {
    let list: Phrase[] = mode === 'ph' ? PHRASES[dialect] : INTL_PHRASES[intlLang]
    if (category !== 'all') list = list.filter(p => p.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.english.toLowerCase().includes(q) ||
        p.phrase.toLowerCase().includes(q)
      )
    }
    return list
  }, [mode, dialect, intlLang, category, search])

  const grouped = useMemo(() => {
    if (category !== 'all' || search.trim()) return null
    return CATEGORIES.reduce((acc, cat) => {
      const items = phrases.filter(p => p.category === cat.id)
      if (items.length) acc[cat.id] = items
      return acc
    }, {} as Record<string, Phrase[]>)
  }, [phrases, category, search])

  const copyPhrase = (phrase: string, key: string) => {
    navigator.clipboard.writeText(phrase)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const currentDialect = DIALECTS.find(d => d.id === dialect)!
  const currentIntlLang = INTL_LANGUAGES.find(l => l.id === intlLang)!

  return (
    <div>
      <PageHeader
        title="Phrasebook"
        subtitle="PH dialects"
        icon={BookOpen}
        iconColor="text-violet-600"
      />

      {/* Mode toggle */}
      <div className="px-4 mb-3">
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-muted">
          {(['ph', 'intl'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setCategory('all'); setSearch('') }}
              className={cn(
                'py-2 rounded-xl text-sm font-semibold transition-all',
                mode === m ? 'bg-violet-500 text-white shadow-sm' : 'text-muted-foreground'
              )}
            >
              {m === 'ph' ? '🇵🇭 PH Dialects' : '🌏 World Languages'}
            </button>
          ))}
        </div>
      </div>

      {/* Language selector */}
      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {mode === 'ph'
            ? DIALECTS.map(d => (
                <button
                  key={d.id}
                  onClick={() => { setDialect(d.id); setCategory('all'); setSearch('') }}
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-2 rounded-2xl border text-center shrink-0 transition-all active:scale-95',
                    dialect === d.id
                      ? 'bg-violet-500 border-violet-500 text-white shadow-sm'
                      : 'bg-card border-border text-muted-foreground hover:border-violet-300'
                  )}
                >
                  <span className="text-base">{d.emoji}</span>
                  <span className="text-[11px] font-semibold leading-tight">{d.label}</span>
                </button>
              ))
            : INTL_LANGUAGES.map(l => (
                <button
                  key={l.id}
                  onClick={() => { setIntlLang(l.id); setCategory('all'); setSearch('') }}
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-2 rounded-2xl border text-center shrink-0 transition-all active:scale-95',
                    intlLang === l.id
                      ? 'bg-violet-500 border-violet-500 text-white shadow-sm'
                      : 'bg-card border-border text-muted-foreground hover:border-violet-300'
                  )}
                >
                  <span className="text-base">{l.emoji}</span>
                  <span className="text-[11px] font-semibold leading-tight">{l.label}</span>
                </button>
              ))
          }
        </div>
      </div>

      {/* Region info */}
      <div className="px-4 mb-3">
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2">
          <p className="text-xs text-violet-700 dark:text-violet-400 font-medium">
            📍 {mode === 'ph' ? `Spoken in: ${currentDialect.region}` : `Spoken in: ${currentIntlLang.region}`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search phrases..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Category chips */}
      {!search && (
        <div className="px-4 mb-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setCategory('all')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all',
                category === 'all' ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              All
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all whitespace-nowrap',
                  category === cat.id ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Phrases */}
      <div className="px-4 pb-8 space-y-4">
        {phrases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">🔍</p>
            <p className="text-sm text-muted-foreground">No phrases found</p>
          </div>
        ) : grouped ? (
          Object.entries(grouped).map(([catId, items]) => {
            const cat = CATEGORIES.find(c => c.id === catId)!
            return (
              <div key={catId}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{cat.emoji}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat.label}</span>
                </div>
                <div className="space-y-2">
                  {items.map((p, i) => (
                    <PhraseCard key={i} phrase={p} copied={copied} onCopy={copyPhrase} />
                  ))}
                </div>
              </div>
            )
          })
        ) : (
          <AnimatePresence>
            {phrases.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <PhraseCard phrase={p} copied={copied} onCopy={copyPhrase} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

function PhraseCard({ phrase, copied, onCopy }: { phrase: Phrase; copied: string | null; onCopy: (p: string, k: string) => void }) {
  const key = phrase.phrase
  const isCopied = copied === key
  return (
    <div className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{phrase.english}</p>
        <p className="text-sm font-bold text-foreground">{phrase.phrase}</p>
        <p className="text-[11px] text-violet-500 dark:text-violet-400 font-medium mt-0.5 italic">{phrase.pronunciation}</p>
      </div>
      <button
        onClick={() => onCopy(phrase.phrase, key)}
        className={cn(
          'shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90',
          isCopied ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-muted hover:bg-muted/80'
        )}
      >
        {isCopied
          ? <Check className="h-3.5 w-3.5 text-emerald-500" />
          : <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        }
      </button>
    </div>
  )
}
