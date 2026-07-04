import { useState, useMemo } from 'react'
import { Globe, Plug, Phone, CreditCard, Info, Shield, Car, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTrip } from '@/contexts/TripContext'
import { cn } from '@/utils/cn'

interface CountryData {
  name: string
  flag: string
  keywords: string[]
  timezone: string
  currency: { code: string; name: string; symbol: string; tip: string }
  visa: { status: 'visa-free' | 'visa-on-arrival' | 'evisa' | 'required'; days?: number; note: string }
  emergency: { police: string; ambulance: string; fire: string; tourist?: string }
  power: { plugs: string[]; voltage: string; tip: string }
  transport: string[]
  language: string
  phrases: { english: string; local: string; pronunciation: string }[]
  tips: string[]
}

const COUNTRIES: CountryData[] = [
  {
    name: 'Japan',
    flag: '🇯🇵',
    keywords: ['japan', 'tokyo', 'osaka', 'kyoto', 'hokkaido', 'okinawa', 'hiroshima', 'nagoya', 'fukuoka', 'sapporo'],
    timezone: 'Asia/Tokyo',
    currency: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', tip: '7-Eleven, FamilyMart, and Japan Post ATMs reliably accept foreign cards. Always carry cash — many small restaurants and temples are cash-only.' },
    visa: { status: 'required', note: 'Philippine passport holders require a visa. Apply at the Japanese Embassy in Manila. Tourist visa (single entry) is typically valid for 30 days. Process takes 4–7 business days.' },
    emergency: { police: '110', ambulance: '119', fire: '119', tourist: '050-3816-2787' },
    power: { plugs: ['Type A', 'Type B'], voltage: '100V / 50–60Hz', tip: 'Japan runs on 100V — the lowest in the world. Most modern electronics (phones, laptops) handle 100–240V. Check your device\'s power brick before plugging in.' },
    transport: [
      'Get a Suica or IC card for seamless travel on trains, buses, and even convenience store purchases.',
      'Shinkansen (bullet train) is fast but pricey — book a JR Pass before you fly if doing multi-city travel.',
      'Taxis are metered and honest but expensive. Ride-hailing apps (GO, S.RIDE) work in major cities.',
      'Google Maps transit directions are excellent for Japan — include walking segments between subway lines.',
    ],
    language: 'Japanese',
    phrases: [
      { english: 'Thank you', local: 'ありがとうございます (Arigatou gozaimasu)', pronunciation: 'ah-ree-GAH-toh goh-zah-ee-MAHS' },
      { english: 'Excuse me / Sorry', local: 'すみません (Sumimasen)', pronunciation: 'soo-mee-MAH-sen' },
      { english: 'Where is...?', local: '...はどこですか？(...wa doko desu ka?)', pronunciation: '...wah DOH-koh dess kah' },
      { english: 'How much?', local: 'いくらですか？(Ikura desu ka?)', pronunciation: 'ee-KOO-rah dess kah' },
      { english: 'Do you speak English?', local: '英語を話せますか？(Eigo wo hanasemasu ka?)', pronunciation: 'AY-go woh hah-NAH-seh-mahs kah' },
      { english: 'Help!', local: '助けて！(Tasukete!)', pronunciation: 'tah-SOO-keh-teh' },
    ],
    tips: [
      'Carry cash at all times — Japan is still very cash-heavy, especially outside major cities.',
      'Trash cans are rare on the street. Keep a small bag in your pocket for rubbish until you find a convenience store bin.',
      'Bowing is the standard greeting. A slight nod of the head is sufficient for tourists.',
      'Quiet mode is expected on trains — no phone calls, keep conversation low, and never eat on local trains.',
    ],
  },
  {
    name: 'South Korea',
    flag: '🇰🇷',
    keywords: ['south korea', 'korea', 'seoul', 'busan', 'jeju', 'incheon', 'daegu', 'gwangju', 'daejeon'],
    timezone: 'Asia/Seoul',
    currency: { code: 'KRW', name: 'South Korean Won', symbol: '₩', tip: 'Currency exchange booths at Myeongdong and Hongdae offer better rates than airports. Woori Bank and Shinhan ATMs in 7-Eleven accept international cards reliably.' },
    visa: { status: 'required', note: 'Philippine passport holders require a visa. Apply at the Korean Embassy in Manila. Tourist visa (C-3) allows up to 59 days. Single and multiple-entry options available. Process typically takes 3–5 business days.' },
    emergency: { police: '112', ambulance: '119', fire: '119', tourist: '1330' },
    power: { plugs: ['Type C', 'Type F'], voltage: '220V / 60Hz', tip: 'Korea uses 220V with round-pin plugs. Filipino appliances rated for 220V work fine. Bring a Type A/F adapter if your plugs are flat-pronged.' },
    transport: [
      'T-money card works across Seoul subway, buses, and taxis — load it at any convenience store.',
      'KakaoTaxi is the dominant ride-hailing app and works with foreign cards via KakaoPay.',
      'The subway system in Seoul is extensive, signposted in English, and very affordable.',
      'KTX high-speed rail connects major cities — book via Korail or AREX for airport trains.',
    ],
    language: 'Korean',
    phrases: [
      { english: 'Thank you', local: '감사합니다 (Gamsahamnida)', pronunciation: 'gam-SAH-ham-nee-dah' },
      { english: 'Hello', local: '안녕하세요 (Annyeonghaseyo)', pronunciation: 'an-NYONG-ha-seh-yo' },
      { english: 'Excuse me', local: '저기요 (Jeogiyo)', pronunciation: 'juh-GEE-yo' },
      { english: 'How much?', local: '얼마예요? (Eolmayeyo?)', pronunciation: 'UL-mah-yeh-yo' },
      { english: 'Where is...?', local: '...어디예요? (...eodiyeyo?)', pronunciation: '...UH-dee-yeh-yo' },
      { english: 'Help!', local: '도와주세요! (Dowajuseyo!)', pronunciation: 'doh-WAH-joo-seh-yo' },
    ],
    tips: [
      'Download Naver Maps — Google Maps has incomplete transit data in Korea due to government restrictions.',
      'Convenience stores (CU, GS25, 7-Eleven) sell excellent cheap food and have free seating areas.',
      'Tipping is not customary and can even be considered rude in some establishments.',
      'Free fast Wi-Fi is available almost everywhere — cafes, subways, airports, and many streets.',
    ],
  },
  {
    name: 'Thailand',
    flag: '🇹🇭',
    keywords: ['thailand', 'bangkok', 'phuket', 'chiang mai', 'pattaya', 'koh samui', 'krabi', 'hua hin', 'ayutthaya', 'pai'],
    timezone: 'Asia/Bangkok',
    currency: { code: 'THB', name: 'Thai Baht', symbol: '฿', tip: 'Superrich and other money changers in Bangkok give better rates than banks. ATMs charge a ฿220 foreign transaction fee per withdrawal — withdraw larger amounts to minimize fees.' },
    visa: { status: 'visa-free', days: 30, note: 'Philippine passport holders enjoy visa-free entry for up to 30 days. Extension of 30 days is available at immigration offices for a fee. Keep your return ticket handy at the border.' },
    emergency: { police: '191', ambulance: '1554', fire: '199', tourist: '1155' },
    power: { plugs: ['Type A', 'Type B', 'Type C'], voltage: '220V / 50Hz', tip: 'Thailand has versatile universal sockets in most hotels that accept Type A, B, and C plugs. Bring a universal adapter to be safe in older establishments.' },
    transport: [
      'Grab is the dominant ride-hailing app and works seamlessly — always agree on the Grab price before hopping in.',
      'Tuk-tuks are fun for short hops but always negotiate the price before boarding.',
      'The BTS Skytrain and MRT in Bangkok have a Rabbit card for easy top-up travel.',
      'Overnight sleeper trains from Bangkok to Chiang Mai are comfortable, scenic, and cheap.',
    ],
    language: 'Thai',
    phrases: [
      { english: 'Thank you (male/female)', local: 'ขอบคุณครับ/ค่ะ (Khob khun khrap/kha)', pronunciation: 'khop-KHUN krap/kah' },
      { english: 'Hello', local: 'สวัสดีครับ/ค่ะ (Sawadee khrap/kha)', pronunciation: 'sa-WAT-dee krap/kah' },
      { english: 'How much?', local: 'ราคาเท่าไหร่? (Raka thao rai?)', pronunciation: 'RAH-kah tao-RAI' },
      { english: 'Where is...?', local: '...อยู่ที่ไหน? (...yoo thi nai?)', pronunciation: '...yoo TEE-nai' },
      { english: 'Too expensive', local: 'แพงเกินไป (Phaeng koern pai)', pronunciation: 'PHAENG-gern-pai' },
      { english: 'Help!', local: 'ช่วยด้วย! (Chuay duay!)', pronunciation: 'CHOO-ay doo-ay' },
    ],
    tips: [
      'Dress modestly when visiting temples — shoulders and knees must be covered. Scarves are sold at entrances.',
      'Never touch anyone\'s head or point your feet toward people or Buddha images — both are considered disrespectful.',
      'Bargaining is expected at markets but not in malls or restaurants with fixed prices.',
      'Street food is generally safe and delicious — look for busy stalls with high turnover as a freshness indicator.',
    ],
  },
  {
    name: 'Hong Kong',
    flag: '🇭🇰',
    keywords: ['hong kong', 'hongkong', 'kowloon', 'lantau', 'tsim sha tsui', 'mong kok', 'causeway bay', 'central hk', 'wan chai'],
    timezone: 'Asia/Hong_Kong',
    currency: { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', tip: 'HSBC and Hang Seng ATMs have low or no foreign card fees. Avoid airport money changers — better rates are available in the city. Octopus card doubles as a payment tool at most shops.' },
    visa: { status: 'visa-free', days: 14, note: 'Philippine passport holders can enter visa-free for up to 14 days. This is strictly enforced — ensure your stay does not exceed 14 days. Extension is not easily granted.' },
    emergency: { police: '999', ambulance: '999', fire: '999', tourist: '2807-6177' },
    power: { plugs: ['Type G'], voltage: '220V / 50Hz', tip: 'Hong Kong uses UK-style Type G three-pin plugs. This is different from both PH and most of Asia. Bring or buy a Type G adapter — available at HK airport and hardware stores.' },
    transport: [
      'Get an Octopus card at any MTR station — it works on the MTR, buses, trams, ferries, and many shops.',
      'The MTR (subway) is fast, clean, and punctual — the most efficient way to get around.',
      'Star Ferry between Tsim Sha Tsui and Central is iconic and costs only HK$3–4.',
      'Uber works in HK but is often pricier than taxis, which are metered and reliable.',
    ],
    language: 'Cantonese',
    phrases: [
      { english: 'Thank you', local: '唔該 / 多謝 (M̀h gòi / Dō je)', pronunciation: 'mm-GOY / doh-JEH' },
      { english: 'Hello', local: '你好 (Néih hóu)', pronunciation: 'nay-HOH' },
      { english: 'How much?', local: '幾錢? (Géi chín?)', pronunciation: 'gay-CHEEN' },
      { english: 'Where is...?', local: '...喺邊度? (...hái bīn douh?)', pronunciation: '...hai bin-DOH' },
      { english: 'Excuse me', local: '唔好意思 (M̀h hóu yi si)', pronunciation: 'mm-how-YEE-see' },
      { english: 'Help!', local: '救命! (Gau meng!)', pronunciation: 'gow-MENG' },
    ],
    tips: [
      'Hong Kong is extremely safe — petty crime is very low compared to other Asian cities.',
      'English is widely spoken in stores, restaurants, and with officials — communication is rarely an issue.',
      'Tap water in HK is potable, but most locals prefer filtered or bottled water.',
      'Hiking trails (Dragon\'s Back, Lion Rock) offer stunning views and are free — bring water.',
    ],
  },
  {
    name: 'Singapore',
    flag: '🇸🇬',
    keywords: ['singapore', 'sentosa', 'orchard', 'marina bay', 'jurong', 'changi', 'little india sg', 'chinatown sg'],
    timezone: 'Asia/Singapore',
    currency: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', tip: 'Use Wise, Revolut, or Charles Schwab for near-zero FX fees. Money changers at Lucky Plaza on Orchard Road and Mustafa Centre offer competitive rates. Avoid airport exchanges.' },
    visa: { status: 'visa-free', days: 30, note: 'Philippine passport holders enjoy visa-free entry for up to 30 days. Singapore immigration is strict — ensure you have proof of onward travel, sufficient funds, and clean travel documents.' },
    emergency: { police: '999', ambulance: '995', fire: '995', tourist: '1800-736-2000' },
    power: { plugs: ['Type G'], voltage: '230V / 50Hz', tip: 'Singapore uses UK-style Type G plugs, same as Hong Kong. Most hotels have universal sockets but bring a Type G adapter for outlets in public areas and older buildings.' },
    transport: [
      'EZ-Link card or Singapore Tourist Pass works on MRT and buses — get one at any MRT station.',
      'Grab is the dominant ride-hailing app. Taxis are also metered and widely available.',
      'The MRT is air-conditioned, punctual, and covers most tourist spots.',
      'Walk between attractions where possible — Singapore is compact and walkways are shaded.',
    ],
    language: 'English (official), Mandarin, Malay, Tamil',
    phrases: [
      { english: 'Thank you', local: 'Thank you / 谢谢 (Xièxiè)', pronunciation: 'SHEH-sheh' },
      { english: 'Can or not? (OK?)', local: 'Can or not? (Singlish)', pronunciation: 'Spoken exactly as written' },
      { english: 'How much?', local: 'How much? / 多少钱? (Duōshǎo qián?)', pronunciation: 'dwoh-SHAO chyen' },
      { english: 'Excuse me', local: 'Excuse me / 对不起 (Duìbuqǐ)', pronunciation: 'dway-boo-CHEE' },
      { english: 'Where is...?', local: 'Where is...? / ...在哪里? (...zài nǎlǐ?)', pronunciation: 'ZAI nah-LEE' },
      { english: 'Help!', local: 'Help! / 救命! (Jiù mìng!)', pronunciation: 'jyoh-MING' },
    ],
    tips: [
      'Fines are strictly enforced — no littering, no eating/drinking on the MRT, no jaywalking.',
      'Hawker centres are the best value for food — a full meal costs S$3–6. Newton, Maxwell, and Lau Pa Sat are iconic.',
      'Singapore has an extremely low crime rate — it is one of the safest cities in Asia.',
      'It is illegal to bring chewing gum into Singapore (except medicinal gum with a prescription).',
    ],
  },
  {
    name: 'Taiwan',
    flag: '🇹🇼',
    keywords: ['taiwan', 'taipei', 'kaohsiung', 'taichung', 'tainan', 'hualien', 'taitung', 'keelung', 'taroko'],
    timezone: 'Asia/Taipei',
    currency: { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', tip: 'Taiwan Post and most major bank ATMs accept foreign cards with minimal fees. Airport money changers are convenient but offer slightly lower rates. Many small night market stalls are cash-only.' },
    visa: { status: 'visa-free', days: 14, note: 'Philippine passport holders can enter visa-free for up to 14 days under the 14-day visa exemption program. For longer stays, apply for an eVisa (up to 30 days) before departure through the Bureau of Consular Affairs website.' },
    emergency: { police: '110', ambulance: '119', fire: '119', tourist: '0800-011-765' },
    power: { plugs: ['Type A', 'Type B'], voltage: '110V / 60Hz', tip: 'Taiwan uses 110V like the US and Japan. Check if your appliances support 110V or are dual-voltage (100–240V). Most smartphones and laptops are fine, but hair dryers and some chargers may not be.' },
    transport: [
      'EasyCard works on MRT, buses, YouBike bicycle sharing, and convenience stores — get one at any MRT station.',
      'Taiwan High Speed Rail (THSR) connects Taipei to Kaohsiung in 90 minutes.',
      'Taipei MRT is clean, efficient, and bilingual — easy to navigate.',
      'Scooter rentals are popular outside Taipei — an international driver\'s license with motorcycle endorsement is required.',
    ],
    language: 'Mandarin Chinese',
    phrases: [
      { english: 'Thank you', local: '謝謝 (Xièxiè)', pronunciation: 'SHEH-sheh' },
      { english: 'Hello', local: '你好 (Nǐ hǎo)', pronunciation: 'nee-HOW' },
      { english: 'How much?', local: '多少錢? (Duōshǎo qián?)', pronunciation: 'dwoh-SHAO chyen' },
      { english: 'Where is...?', local: '...在哪裡? (...zài nǎlǐ?)', pronunciation: 'ZAI nah-LEE' },
      { english: 'Excuse me', local: '不好意思 (Bù hǎo yìsi)', pronunciation: 'boo-HOW-ee-suh' },
      { english: 'Help!', local: '救命! (Jiù mìng!)', pronunciation: 'jyoh-MING' },
    ],
    tips: [
      'Night markets (Shilin, Raohe, Fengjia) are a must — food, souvenirs, and atmosphere all in one.',
      'Taiwan is extremely safe and welcoming to tourists — locals go out of their way to help.',
      'Free Wi-Fi (iTaiwan) is available at government buildings, tourist sites, and many public spaces.',
      'Bubble tea (珍珠奶茶) originated in Taiwan — try it at 50嵐 or Chun Shui Tang for the authentic experience.',
    ],
  },
  {
    name: 'Vietnam',
    flag: '🇻🇳',
    keywords: ['vietnam', 'hanoi', 'ho chi minh', 'saigon', 'da nang', 'hoi an', 'hue', 'nha trang', 'phu quoc', 'ha long', 'halong', 'sapa'],
    timezone: 'Asia/Ho_Chi_Minh',
    currency: { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', tip: 'Vietcombank and Techcombank ATMs accept foreign cards. Withdraw in larger denominations (500k–1M VND) to minimize transaction fees. Note: 1M VND ≈ ₱2,400 — keep track of the zeros.' },
    visa: { status: 'evisa', days: 90, note: 'Philippine passport holders can apply for a Vietnam eVisa (E-visa) online at evisa.xuatnhapcanh.gov.vn. Cost is USD 25 for a single entry, valid for up to 90 days. Alternatively, visa-on-arrival is available through a letter of approval from a travel agency.' },
    emergency: { police: '113', ambulance: '115', fire: '114', tourist: '1800-599-920' },
    power: { plugs: ['Type A', 'Type C', 'Type F'], voltage: '220V / 50Hz', tip: 'Vietnam sockets vary widely — bring a universal adapter. Many modern hotels have universal sockets. Older guesthouses may have only round-pin (Type C/F) outlets.' },
    transport: [
      'Grab is the safest and most transparent way to get around — no haggling, no scams, price shown upfront.',
      'Xe om (motorbike taxis) are ubiquitous — use GrabBike for metered pricing if you\'re comfortable on motorbikes.',
      'The Reunification Express train runs the full length of Vietnam — book tickets via 12go.asia.',
      'Open-bus tickets (Sinh Tourist, Phuong Trang) are popular for backpackers doing the north-south route.',
    ],
    language: 'Vietnamese',
    phrases: [
      { english: 'Thank you', local: 'Cảm ơn', pronunciation: 'gahm-UN' },
      { english: 'Hello', local: 'Xin chào', pronunciation: 'sin-CHOW' },
      { english: 'How much?', local: 'Bao nhiêu?', pronunciation: 'bow-NYEW' },
      { english: 'Where is...?', local: '...ở đâu? (...o dau?)', pronunciation: '...uh-DOH' },
      { english: 'Too expensive', local: 'Mắc quá', pronunciation: 'mahk-KWAH' },
      { english: 'Help!', local: 'Cứu tôi!', pronunciation: 'GEW-toy' },
    ],
    tips: [
      'Always negotiate prices at markets and for xe om rides before getting on — fix the price first.',
      'Traffic in Hanoi and HCMC is intense. To cross the street, walk slowly and steadily — let motorbikes flow around you.',
      'Pho and banh mi are best eaten at local street stalls, not tourist restaurants. Follow the locals.',
      'Be cautious of the "cyclo scam" where a seemingly agreed price triples at the destination.',
    ],
  },
  {
    name: 'Indonesia',
    flag: '🇮🇩',
    keywords: ['indonesia', 'bali', 'jakarta', 'lombok', 'yogyakarta', 'surabaya', 'bandung', 'komodo', 'flores', 'gili', 'ubud', 'seminyak', 'kuta'],
    timezone: 'Asia/Jakarta',
    currency: { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', tip: 'BCA and Mandiri ATMs are the most reliable for foreign cards. Money changers on Bali\'s Kuta-Legian strip give competitive rates — count your money carefully. Note: Rp 1,000,000 ≈ ₱3,500.' },
    visa: { status: 'visa-free', days: 30, note: 'Philippine passport holders enjoy visa-free entry for 30 days under the Bebas Visa arrangement. Extension is possible for an additional 30 days at the immigration office. Ensure your passport has at least 6 months validity.' },
    emergency: { police: '110', ambulance: '118', fire: '113', tourist: '021-3521255' },
    power: { plugs: ['Type C', 'Type F'], voltage: '220V / 50Hz', tip: 'Indonesia uses European-style round-pin plugs. Bring a Type C or F adapter. Power outages can occur in more remote areas — a power bank is handy.' },
    transport: [
      'Grab and Gojek are both widely used in major cities — Gojek is locally preferred in Indonesia.',
      'Scooter rental in Bali is the most practical way to explore — around Rp 70,000–100,000/day.',
      'The DAMRI bus connects Ngurah Rai Airport to Kuta, Seminyak, and Ubud cheaply.',
      'Fast boats connect Bali to Gili Islands and Lombok — book with reputable operators like Eka Jaya or Scoot.',
    ],
    language: 'Bahasa Indonesia',
    phrases: [
      { english: 'Thank you', local: 'Terima kasih', pronunciation: 'teh-REE-mah KAH-see' },
      { english: 'Hello', local: 'Halo / Selamat', pronunciation: 'HAH-lo / seh-LAH-mat' },
      { english: 'How much?', local: 'Berapa harganya?', pronunciation: 'beh-RAH-pah har-GAH-nya' },
      { english: 'Where is...?', local: 'Di mana...?', pronunciation: 'dee MAH-nah' },
      { english: 'Too expensive', local: 'Terlalu mahal', pronunciation: 'ter-LAH-loo mah-HAL' },
      { english: 'Help!', local: 'Tolong!', pronunciation: 'TOH-long' },
    ],
    tips: [
      'Dress modestly at temples — sarong and sash are required. Many temples provide them for a small fee or loan.',
      'Bali has a Hindu culture — be respectful of ceremonies, cremations, and offerings on the ground (don\'t step on them).',
      'The tourist tax (Rp 150,000) is required for all foreign tourists entering Bali — pay online or at the airport.',
      'Drink only bottled or filtered water everywhere in Indonesia — tap water is not safe.',
    ],
  },
  {
    name: 'Malaysia',
    flag: '🇲🇾',
    keywords: ['malaysia', 'kuala lumpur', 'kl', 'penang', 'langkawi', 'kota kinabalu', 'sabah', 'sarawak', 'johor', 'malacca', 'ipoh', 'george town'],
    timezone: 'Asia/Kuala_Lumpur',
    currency: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', tip: 'Maybank, CIMB, and RHB ATMs reliably accept foreign cards. Currency exchange at KLCC, Berjaya Times Square, and Sungei Wang offer competitive rates. Avoid hotel exchanges.' },
    visa: { status: 'visa-free', days: 30, note: 'Philippine passport holders enjoy visa-free entry for 30 days. Ensure your passport has at least 6 months validity and you can demonstrate sufficient funds. Extension is possible at the immigration department.' },
    emergency: { police: '999', ambulance: '999', fire: '994', tourist: '1300-88-5050' },
    power: { plugs: ['Type G'], voltage: '240V / 50Hz', tip: 'Malaysia uses UK-style Type G plugs. Bring a Type G adapter. Voltage is 240V, higher than PH\'s 220V — check that dual-voltage devices support up to 240V.' },
    transport: [
      'Grab is the dominant ride-hailing app in Malaysia and works seamlessly throughout the country.',
      'KL Sentral is the central transport hub — KLIA Ekspres train reaches the airport in 28 minutes.',
      'The Klang Valley MRT, LRT, and monorail system covers most of KL\'s tourist areas.',
      'Long-distance buses (Transnasional, Plusliner) are comfortable and affordable for intercity travel.',
    ],
    language: 'Bahasa Malaysia',
    phrases: [
      { english: 'Thank you', local: 'Terima kasih', pronunciation: 'teh-REE-mah KAH-see' },
      { english: 'Hello', local: 'Halo / Selamat datang', pronunciation: 'HAH-lo / seh-LAH-mat DAH-tang' },
      { english: 'How much?', local: 'Berapa harga?', pronunciation: 'beh-RAH-pah HAR-gah' },
      { english: 'Where is...?', local: 'Di mana...?', pronunciation: 'dee MAH-nah' },
      { english: 'Delicious!', local: 'Sedap!', pronunciation: 'SEH-dap' },
      { english: 'Help!', local: 'Tolong!', pronunciation: 'TOH-long' },
    ],
    tips: [
      'Malaysia is a Muslim-majority country — dress modestly outside of tourist areas and beach resorts.',
      'Hawker centres and kopitiam coffee shops offer excellent cheap food — nasi lemak, roti canai, and char kuey teow.',
      'Malay, Chinese, and Indian cultures coexist — experience all three through the food, temples, and festivals.',
      'Bargaining is acceptable at night markets and smaller shops, but not in malls or restaurants.',
    ],
  },
  {
    name: 'United States',
    flag: '🇺🇸',
    keywords: ['united states', 'usa', 'us', 'america', 'new york', 'los angeles', 'chicago', 'miami', 'las vegas', 'san francisco', 'hawaii', 'boston', 'washington dc', 'seattle', 'orlando', 'houston', 'dallas'],
    timezone: 'America/New_York',
    currency: { code: 'USD', name: 'US Dollar', symbol: '$', tip: 'Virtually all ATMs accept foreign cards (Visa/Mastercard). Avoid airport currency exchange counters — use your bank\'s ATM or Wise/Revolut for best rates. Credit cards are accepted almost everywhere.' },
    visa: { status: 'required', note: 'Philippine passport holders require a B1/B2 tourist/business visa from the US Embassy in Manila. The visa interview is mandatory. Processing can take weeks to months depending on appointment availability. Apply well in advance.' },
    emergency: { police: '911', ambulance: '911', fire: '911' },
    power: { plugs: ['Type A', 'Type B'], voltage: '120V / 60Hz', tip: 'USA runs on 120V — lower than PH\'s 220V. Check your device power bricks: most modern electronics are dual-voltage (100–240V). Hair dryers rated only for 220V will not work or may burn out.' },
    transport: [
      'Public transit quality varies enormously by city — excellent in NYC and Chicago, minimal in LA and Las Vegas.',
      'Uber and Lyft are the dominant ride-hailing apps and available in virtually every city.',
      'Renting a car is often essential outside major cities — an international driver\'s permit is recommended.',
      'Amtrak trains connect major cities but are slower and pricier than flying for distances over 400 miles.',
    ],
    language: 'English',
    phrases: [
      { english: 'Excuse me', local: 'Excuse me / Pardon me', pronunciation: 'ex-KYOOZ me / PAR-don me' },
      { english: 'Check please', local: 'Check, please / Can I get the check?', pronunciation: 'As written' },
      { english: 'Restroom', local: 'Restroom / Bathroom / Men\'s / Ladies\'', pronunciation: 'REST-room' },
      { english: 'To go (takeaway)', local: 'To go / For here or to go?', pronunciation: 'As written' },
      { english: 'Tip included?', local: 'Is gratuity included?', pronunciation: 'iz GRAT-yoo-ih-tee in-KLOO-ded' },
      { english: 'Help!', local: 'Help! / Call 911!', pronunciation: 'As written' },
    ],
    tips: [
      'Tipping is culturally mandatory — 18–20% at restaurants, $1–2/drink at bars, $2–5/day for hotel housekeeping.',
      'US healthcare is extremely expensive without insurance. Buy comprehensive travel insurance before your trip.',
      'Sales tax is added at checkout and not included in displayed prices — factor in 5–10% depending on the state.',
      'The US is massive — factor in large travel distances. Flying between coasts takes 5–6 hours.',
    ],
  },
  {
    name: 'United Kingdom',
    flag: '🇬🇧',
    keywords: ['united kingdom', 'uk', 'england', 'london', 'scotland', 'wales', 'edinburgh', 'manchester', 'birmingham', 'liverpool', 'bristol', 'oxford', 'cambridge', 'bath'],
    timezone: 'Europe/London',
    currency: { code: 'GBP', name: 'British Pound Sterling', symbol: '£', tip: 'Revolut and Wise offer the best GBP exchange rates with no markup. UK ATMs (free-to-use ones have a logo by the door) don\'t charge fees — your home bank may though. Contactless payment is nearly universal.' },
    visa: { status: 'required', note: 'Philippine passport holders require a Standard Visitor Visa. Apply online at gov.uk/standard-visitor-visa. Applications must be made in advance — processing typically takes 3 weeks. Biometric data (fingerprints) required at a visa application centre.' },
    emergency: { police: '999', ambulance: '999', fire: '999', tourist: '0300-123-2040' },
    power: { plugs: ['Type G'], voltage: '230V / 50Hz', tip: 'UK uses the distinctive three-pin Type G plug — the largest and bulkiest standard plug in the world. A UK adapter is essential. Do not force a flat-pin (Type A) plug into a UK socket.' },
    transport: [
      'Oyster card or contactless bank card (tap in, tap out) for all London transport — buses, Tube, Elizabeth line, Overground.',
      'National Rail connects cities across the UK — book in advance on Trainline or National Rail for cheaper fares.',
      'The Tube (London Underground) is the fastest way across central London despite its age.',
      'BritRail passes can be excellent value for multi-city travel if bought before arriving in the UK.',
    ],
    language: 'English',
    phrases: [
      { english: 'Excuse me (getting attention)', local: 'Excuse me / Sorry', pronunciation: 'As written — always polite' },
      { english: 'Cheers (thank you)', local: 'Cheers / Ta', pronunciation: 'As written' },
      { english: 'Queue (line up)', local: 'Queue / Join the queue', pronunciation: 'KYOO' },
      { english: 'Loo (restroom)', local: 'Where\'s the loo? / Toilet?', pronunciation: 'LOO' },
      { english: 'Brilliant / Lovely', local: 'Brilliant / Lovely (means great)', pronunciation: 'BRIL-yant / LUV-lee' },
      { english: 'Help!', local: 'Help! / Call 999!', pronunciation: 'As written' },
    ],
    tips: [
      'Always queue (line up) — pushing in or not queuing properly is considered extremely rude.',
      'Pubs are central to British social life — "going to the pub" is how locals relax, catch up, and celebrate.',
      'NHS emergency care is free for visitors in genuine emergencies. For non-emergency care, you\'ll be charged.',
      'The weather changes rapidly — carry a compact umbrella even on sunny mornings.',
    ],
  },
  {
    name: 'Australia',
    flag: '🇦🇺',
    keywords: ['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'gold coast', 'cairns', 'darwin', 'canberra', 'great barrier reef', 'uluru'],
    timezone: 'Australia/Sydney',
    currency: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', tip: 'Commonwealth Bank, ANZ, and NAB ATMs are reliable for foreign cards. Revolut and Wise offer near-interbank rates. Tap-and-go (contactless) is nearly universal — you can go weeks without cash in major cities.' },
    visa: { status: 'evisa', note: 'Philippine passport holders require an Electronic Travel Authority (ETA) or a regular visa. Apply for an ETA via the Australian ETA app (AUD 20 processing fee). Alternatively, apply for a Visitor Visa (subclass 600) online at immi.homeaffairs.gov.au. Processing varies from days to weeks.' },
    emergency: { police: '000', ambulance: '000', fire: '000', tourist: '1300-006-786' },
    power: { plugs: ['Type I'], voltage: '230V / 50Hz', tip: 'Australia uses the unique Type I plug (angled flat pins). A Type I adapter is essential — it is not common in Asia. Most international hotels have universal sockets in the bathroom for shavers.' },
    transport: [
      'Opal card (Sydney), Myki (Melbourne), and Go card (Brisbane) are reloadable transit cards for local transport.',
      'Uber is widely used. Taxis are metered and reliable but more expensive.',
      'Distances between cities are vast — domestic flights are usually faster and comparable in price to long bus rides.',
      'Driving is on the left side of the road, same as PH. Rental cars require a valid driver\'s license (IDP recommended).',
    ],
    language: 'English',
    phrases: [
      { english: 'G\'day (hello)', local: 'G\'day / G\'day mate', pronunciation: 'g\'DAY / g\'DAY mayt' },
      { english: 'No worries (you\'re welcome)', local: 'No worries / She\'ll be right', pronunciation: 'No WOR-eez' },
      { english: 'Arvo (afternoon)', local: 'This arvo (this afternoon)', pronunciation: 'AHR-voh' },
      { english: 'Brekkie (breakfast)', local: 'Brekkie', pronunciation: 'BREK-ee' },
      { english: 'How ya going? (how are you?)', local: 'How ya going? / How are ya?', pronunciation: 'how-yah-GOH-ing' },
      { english: 'Help!', local: 'Help! / Call 000!', pronunciation: 'As written' },
    ],
    tips: [
      'The sun is extremely intense in Australia due to the thin ozone layer — wear SPF 50+ and reapply often.',
      'Australia has some of the world\'s deadliest animals — follow safety signs, especially at beaches (jellyfish, sharks) and in the outback.',
      'Always swim between the red and yellow flags at patrolled beaches — rip currents are extremely dangerous.',
      'Tipping is not mandatory but appreciated for good service — 10% is generous.',
    ],
  },
  {
    name: 'France',
    flag: '🇫🇷',
    keywords: ['france', 'paris', 'nice', 'lyon', 'marseille', 'bordeaux', 'strasbourg', 'toulouse', 'normandy', 'provence', 'alps france'],
    timezone: 'Europe/Paris',
    currency: { code: 'EUR', name: 'Euro', symbol: '€', tip: 'Revolut and Wise offer excellent EUR rates. La Banque Postale (post office) ATMs are free for many foreign cards. Avoid Euronet ATMs in tourist areas — their dynamic currency conversion (DCC) is a hidden fee trap. Always choose to pay in euros, not PHP.' },
    visa: { status: 'required', note: 'Philippine passport holders require a Schengen Visa (Type C). Apply at VFS Global (French Embassy) in Manila well in advance — minimum 15 working days before departure. A Schengen visa allows entry to all 27 Schengen area countries.' },
    emergency: { police: '17', ambulance: '15', fire: '18', tourist: '3975' },
    power: { plugs: ['Type C', 'Type E'], voltage: '230V / 50Hz', tip: 'France uses Type E (French) sockets, compatible with Type C plugs. A Type C/E adapter is needed. 230V is slightly higher than PH\'s 220V — check dual-voltage rating on your devices.' },
    transport: [
      'The Paris Métro is fast and covers the entire city — Navigo Découverte weekly pass is great for longer stays.',
      'TGV high-speed trains connect Paris to other French cities and neighboring countries in hours.',
      'Vélib\' bicycle sharing in Paris is convenient for daytime sightseeing in central areas.',
      'Taxis and Uber are available from airports — avoid unlicensed drivers at Charles de Gaulle.',
    ],
    language: 'French',
    phrases: [
      { english: 'Thank you', local: 'Merci (beaucoup)', pronunciation: 'mehr-SEE (boh-KOO)' },
      { english: 'Hello / Good day', local: 'Bonjour', pronunciation: 'bon-ZHOOR' },
      { english: 'Excuse me / Sorry', local: 'Excusez-moi / Pardon', pronunciation: 'ex-kyoo-ZAY-mwah / par-DON' },
      { english: 'Do you speak English?', local: 'Parlez-vous anglais?', pronunciation: 'par-lay-VOO ong-GLAY' },
      { english: 'Where is...?', local: 'Où est...?', pronunciation: 'oo-EH' },
      { english: 'Help!', local: 'Au secours!', pronunciation: 'oh-seh-KOOR' },
    ],
    tips: [
      'Always greet with "Bonjour" before speaking in any shop or restaurant — it is considered rude to skip the greeting.',
      'Paris is generally safe but pickpocketing is common at tourist sites (Eiffel Tower, Louvre, Métro) — use anti-theft bags.',
      'Lunch (12–2pm) is the main meal of the day for many locals — restaurants fill up fast and may close after 2pm.',
      'Service is included in restaurant bills (service compris) — an extra tip is optional and appreciated but not expected.',
    ],
  },
  {
    name: 'Spain',
    flag: '🇪🇸',
    keywords: ['spain', 'madrid', 'barcelona', 'seville', 'valencia', 'granada', 'bilbao', 'malaga', 'ibiza', 'mallorca', 'tenerife'],
    timezone: 'Europe/Madrid',
    currency: { code: 'EUR', name: 'Euro', symbol: '€', tip: 'Revolut and Wise offer the best EUR rates. Avoid Euronet ATMs — use La Caixa or BBVA ATMs which generally have lower fees. Always decline DCC (dynamic currency conversion) and pay in euros.' },
    visa: { status: 'required', note: 'Philippine passport holders require a Schengen Visa (Type C). Apply at VFS Global (Spanish Embassy) in Manila. A Schengen visa also grants entry to all 27 Schengen countries. Apply at least 15 working days in advance.' },
    emergency: { police: '091', ambulance: '112', fire: '080', tourist: '902-102-112' },
    power: { plugs: ['Type C', 'Type F'], voltage: '230V / 50Hz', tip: 'Spain uses Type F (Schuko) sockets, compatible with Type C plugs. Bring a Type C or F adapter. 230V devices require dual-voltage compatibility.' },
    transport: [
      'Renfe AVE high-speed rail connects Madrid, Barcelona, Seville, and Valencia rapidly.',
      'Metro systems in Madrid and Barcelona are efficient and affordable — buy a T-Casual card for 10 trips.',
      'Cabify and Uber operate in major Spanish cities alongside traditional metered taxis.',
      'BlaBlaCar (rideshare) is popular between cities as a budget alternative to trains.',
    ],
    language: 'Spanish (Castilian)',
    phrases: [
      { english: 'Thank you', local: 'Gracias', pronunciation: 'GRAH-thyahs' },
      { english: 'Hello', local: 'Hola', pronunciation: 'OH-lah' },
      { english: 'Excuse me', local: 'Perdona / Disculpa', pronunciation: 'pehr-DOH-nah / dis-KOOL-pah' },
      { english: 'Where is...?', local: '¿Dónde está...?', pronunciation: 'DON-deh es-TAH' },
      { english: 'How much?', local: '¿Cuánto cuesta?', pronunciation: 'KWAHN-toh KWES-tah' },
      { english: 'Help!', local: '¡Socorro! / ¡Ayuda!', pronunciation: 'so-KOH-roh / ah-YOO-dah' },
    ],
    tips: [
      'Lunch is the biggest meal of the day (2–4pm) and dinner is eaten very late (9–11pm) — adjust your schedule.',
      'The siesta (1–5pm) is still observed in smaller towns — some shops close during these hours.',
      'Tapas are free with drinks in Granada and Salamanca — order a beer or wine and get free food.',
      'Avoid eating in restaurants directly on Las Ramblas or Plaza Mayor — they are tourist traps with inflated prices.',
    ],
  },
  {
    name: 'Italy',
    flag: '🇮🇹',
    keywords: ['italy', 'rome', 'milan', 'venice', 'florence', 'naples', 'sicily', 'amalfi', 'cinque terre', 'tuscany', 'bologna', 'turin'],
    timezone: 'Europe/Rome',
    currency: { code: 'EUR', name: 'Euro', symbol: '€', tip: 'Use Revolut or Wise for the best EUR rates. Banca Monte dei Paschi and Intesa Sanpaolo ATMs are reliable. Always carry some cash — many smaller restaurants, markets, and museums are cash-only or prefer it.' },
    visa: { status: 'required', note: 'Philippine passport holders require a Schengen Visa (Type C). Apply at the Italian Embassy or VFS Global in Manila at least 15 working days before departure. The Schengen visa permits travel across all 27 Schengen countries during its validity period.' },
    emergency: { police: '113', ambulance: '118', fire: '115', tourist: '06-4674' },
    power: { plugs: ['Type C', 'Type F', 'Type L'], voltage: '230V / 50Hz', tip: 'Italy uniquely uses Type L (Italian) plugs with three round pins in a line. Type C plugs fit in Type L sockets. A Type C adapter covers most scenarios; some sockets require a Type L adapter.' },
    transport: [
      'Trenitalia and Italo high-speed trains (Frecciarossa, Italotreno) connect major cities quickly.',
      'Vaporetti (water buses) in Venice are the main transport — get a 48h or 72h travel pass.',
      'Uber is banned in most Italian cities — use local taxi apps (itTaxi) or hail street taxis.',
      'ZTL (Limited Traffic Zones) in historic centers — rental cars will incur automatic fines if entered.',
    ],
    language: 'Italian',
    phrases: [
      { english: 'Thank you', local: 'Grazie', pronunciation: 'GRAH-tsyeh' },
      { english: 'Hello / Good day', local: 'Buongiorno / Ciao', pronunciation: 'bwon-JOR-no / CHOW' },
      { english: 'Excuse me / Sorry', local: 'Scusi / Mi dispiace', pronunciation: 'SKOO-zee / mee-dis-PYAH-cheh' },
      { english: 'Where is...?', local: 'Dov\'è...?', pronunciation: 'doh-VEH' },
      { english: 'Do you speak English?', local: 'Parla inglese?', pronunciation: 'PAR-la een-GLAY-zeh' },
      { english: 'Help!', local: 'Aiuto!', pronunciation: 'ah-YOO-toh' },
    ],
    tips: [
      'Book major attractions (Colosseum, Vatican, Uffizi, Last Supper) well in advance — same-day tickets are rare and long queues are brutal.',
      'Standing at a bar (al banco) for coffee is cheaper than sitting at a table (al tavolo).',
      'Restaurants add a "coperto" (cover charge) of €1–4 per person — this is normal and not a scam.',
      'Validate your train ticket (stamp it) before boarding — inspectors fine unvalidated tickets heavily.',
    ],
  },
  {
    name: 'UAE',
    flag: '🇦🇪',
    keywords: ['uae', 'dubai', 'abu dhabi', 'sharjah', 'ajman', 'united arab emirates', 'emirates'],
    timezone: 'Asia/Dubai',
    currency: { code: 'AED', name: 'UAE Dirham', symbol: 'AED', tip: 'UAE Dirham is pegged to the USD. Exchange rates are consistent across reputable money changers. Al Ansari Exchange and UAE Exchange offer competitive rates. ATMs throughout Dubai have low foreign card fees.' },
    visa: { status: 'visa-on-arrival', days: 30, note: 'Philippine passport holders are eligible for a visa-on-arrival for 30 days, extendable once for another 30 days. Ensure your passport is valid for at least 6 months. OFWs and those with specific employment records may face additional checks.' },
    emergency: { police: '999', ambulance: '998', fire: '997', tourist: '800-DUBAI (38224)' },
    power: { plugs: ['Type G'], voltage: '220–240V / 50Hz', tip: 'UAE uses UK-style Type G plugs. A Type G adapter is required. Most modern hotel rooms in Dubai also have USB charging ports built into outlets.' },
    transport: [
      'Dubai Metro (Red and Green lines) is modern, affordable, and air-conditioned — use the Nol card.',
      'Careem and Uber are both widely used — Careem is the local brand (owned by Uber).',
      'Taxis are metered and heavily regulated — no haggling required. Ladies-only taxis are available.',
      'Abu Dhabi is 90 minutes by bus or taxi from Dubai — intercity buses from Al Ghubaiba station.',
    ],
    language: 'Arabic (English widely spoken)',
    phrases: [
      { english: 'Thank you', local: 'Shukran (شكراً)', pronunciation: 'SHOOK-ran' },
      { english: 'Hello (Peace be upon you)', local: 'As-salamu alaykum (السلام عليكم)', pronunciation: 'as-SAL-ah-moo ah-LAY-kum' },
      { english: 'Welcome / You\'re welcome', local: 'Ahlan wa sahlan / Afwan (أهلاً وسهلاً / عفواً)', pronunciation: 'AH-lan wah SAH-lan / af-WAN' },
      { english: 'How much?', local: 'Bikam? (بكم؟)', pronunciation: 'bee-KAM' },
      { english: 'Where is...?', local: 'Ayna...? (أين...؟)', pronunciation: 'AY-nah' },
      { english: 'Help!', local: 'Musaada! (مساعدة!)', pronunciation: 'moo-SAH-ah-dah' },
    ],
    tips: [
      'Dress modestly in public spaces, malls, and markets — shoulders and knees should be covered. Beachwear is only for beaches.',
      'Public displays of affection are illegal. Avoid kissing, hugging, or holding hands in public.',
      'Ramadan significantly changes daily life — eating, drinking, and smoking in public during daylight hours is prohibited.',
      'Dubai is extremely safe with very low crime — but laws are strictly enforced. Respect local customs and laws.',
    ],
  },
  {
    name: 'Maldives',
    flag: '🇲🇻',
    keywords: ['maldives', 'male', 'malé', 'maafushi', 'hulhumale', 'baa atoll', 'ari atoll'],
    timezone: 'Indian/Maldives',
    currency: { code: 'MVR', name: 'Maldivian Rufiyaa', symbol: 'Rf', tip: 'Resorts use USD for almost everything — bring USD cash or a card that charges no foreign transaction fees. Local guesthouses on budget islands use Rufiyaa. Exchange at Malé airport or in the city.' },
    visa: { status: 'visa-on-arrival', days: 30, note: 'Philippine passport holders receive a free 30-day visa on arrival at Velana International Airport. Extendable to 90 days at the Department of Immigration. Ensure you have proof of accommodation booking and sufficient funds.' },
    emergency: { police: '119', ambulance: '102', fire: '118', tourist: '332-3224' },
    power: { plugs: ['Type G', 'Type D', 'Type J'], voltage: '230V / 50Hz', tip: 'Most resorts have Type G UK-style sockets. Smaller guesthouses may have varied socket types. Bring a universal adapter to cover all scenarios. Some overwater villas have USB sockets in lamps.' },
    transport: [
      'Speedboat transfers connect the airport to nearby atolls (30 min–2 hrs) — book through your accommodation.',
      'Seaplane (Twin Otter) is the iconic and fastest way to reach remote atolls — booked through resorts.',
      'Local ferries (state-run) serve the inhabited island chain at very low cost — great for budget travelers.',
      'Dhoni (traditional Maldivian wooden boat) trips are offered by resorts for snorkeling and fishing excursions.',
    ],
    language: 'Dhivehi (English widely spoken at resorts)',
    phrases: [
      { english: 'Thank you', local: 'Shukuriyyaa (ޝުކުރިއްޔާ)', pronunciation: 'shoo-KOO-ree-yah' },
      { english: 'Hello', local: 'Assalaam alaikum / Kihineh? (ކިހިނެއް؟)', pronunciation: 'kee-HEE-neh' },
      { english: 'Good / Fine', local: 'Rangalhu (ރަނގަޅު)', pronunciation: 'RUNG-ga-loo' },
      { english: 'How much?', local: 'Kihavareh? (ކިހާވަރެއް؟)', pronunciation: 'kee-HAH-vah-reh' },
      { english: 'Beautiful', local: 'Furihamaveri (ފުރިހަމަ)', pronunciation: 'foo-REE-ha-mah-veh-ree' },
      { english: 'Help!', local: 'Aavadeh! (އަވަދެ!)', pronunciation: 'ah-VAH-deh' },
    ],
    tips: [
      'The Maldives is a Muslim country — alcohol is only permitted at resort islands, not local islands.',
      'Bikinis are only appropriate at resort beaches — dress modestly when visiting local islands.',
      'Marine life is extraordinary — bring an underwater camera and respect no-touch rules for coral and marine animals.',
      'The dry season (November–April) is ideal. Wet season (May–October) brings rain but fewer crowds and lower prices.',
    ],
  },
  {
    name: 'Cambodia',
    flag: '🇰🇭',
    keywords: ['cambodia', 'siem reap', 'angkor', 'phnom penh', 'sihanoukville', 'kampot', 'kep', 'battambang'],
    timezone: 'Asia/Phnom_Penh',
    currency: { code: 'USD', name: 'US Dollar (primary)', symbol: '$', tip: 'USD is widely used alongside the Riel (KHR). Most transactions, hotels, and tuk-tuk fares are quoted in USD. Change is given in Riel. ACLEDA and ABA Bank ATMs dispense USD reliably.' },
    visa: { status: 'visa-on-arrival', days: 30, note: 'Philippine passport holders can get a visa on arrival at major border crossings and Phnom Penh/Siem Reap airports. Cost is USD 30 for a tourist visa. Alternatively, apply for an eVisa at evisa.gov.kh for USD 36 (includes processing fee).' },
    emergency: { police: '117', ambulance: '119', fire: '118', tourist: '012-981-281' },
    power: { plugs: ['Type A', 'Type C', 'Type G'], voltage: '230V / 50Hz', tip: 'Cambodia has a mix of socket types — many guesthouses have universal sockets. Bring a compact universal adapter. Power outages can occur in rural areas and near Angkor.' },
    transport: [
      'Tuk-tuks are the most iconic and practical way to get around Siem Reap and Phnom Penh — negotiate fare first.',
      'Grab operates in Phnom Penh with metered pricing. PassApp is the local Cambodian ride-hailing alternative.',
      'Mekong Express and Giant Ibis are reliable intercity bus companies with comfortable coaches.',
      'Renting a bicycle in Siem Reap is excellent for exploring Angkor Wat at your own pace (arrive early for sunrise).',
    ],
    language: 'Khmer',
    phrases: [
      { english: 'Thank you', local: ' អរគុណ (Aw-kun)', pronunciation: 'aw-KUN' },
      { english: 'Hello', local: 'ជំរាបសួរ (Chum reap suor)', pronunciation: 'choom-REAP-soo' },
      { english: 'How much?', local: 'តម្លៃប៉ុន្មាន? (Tlai ponman?)', pronunciation: 'tlai-PON-man' },
      { english: 'Where is...?', local: '...នៅឯណា? (...nov ae na?)', pronunciation: 'nov-AY-nah' },
      { english: 'Too expensive', local: 'ថ្លៃពេក (Tlai pek)', pronunciation: 'tlai-PEK' },
      { english: 'Help!', local: 'ជួយផង! (Juoy phong!)', pronunciation: 'joo-ay PHONG' },
    ],
    tips: [
      'Angkor Wat tickets: 1-day USD 37, 3-day USD 62, 7-day USD 72 — buy at the official ticketing gate, not from touts.',
      'Remove shoes and dress modestly (covered shoulders and knees) when entering temple complexes.',
      'Drink only bottled water — tap water and ice from unknown sources are not safe.',
      'Cambodia is predominantly Buddhist — show respect at pagodas, do not touch monks, and dress conservatively.',
    ],
  },
  {
    name: 'Macau',
    flag: '🇲🇴',
    keywords: ['macau', 'macao', 'cotai', 'taipa', 'coloane'],
    timezone: 'Asia/Macau',
    currency: { code: 'MOP', name: 'Macanese Pataca', symbol: 'MOP$', tip: 'HKD is accepted almost everywhere in Macau at a 1:1 rate (actual rate is ~1.03 HKD = 1 MOP). BNU and Bank of China ATMs accept foreign cards. Casinos accept HKD for chips.' },
    visa: { status: 'visa-free', days: 30, note: 'Philippine passport holders can enter Macau visa-free for up to 30 days. This is separate from Hong Kong — you will go through immigration if visiting both. The visa-free period resets each time you enter.' },
    emergency: { police: '999', ambulance: '999', fire: '999', tourist: '2833-3000' },
    power: { plugs: ['Type G', 'Type M'], voltage: '220V / 50Hz', tip: 'Macau primarily uses Type G (UK) plugs, same as Hong Kong. Most hotel rooms have universal sockets. Bring a Type G adapter as a backup for public outlets.' },
    transport: [
      'Free casino shuttle buses run from the Outer Harbour Ferry Terminal and airport to all major casinos.',
      'Taxis are inexpensive and widely available — Macau is small enough that most trips cost MOP 30–80.',
      'Walking between the Historic Centre, Taipa Village, and Cotai is feasible — Macau is compact.',
      'High-speed ferry or TurboJET connects Macau to Hong Kong (1 hour) — book in advance during peak season.',
    ],
    language: 'Cantonese, Portuguese (official), Mandarin',
    phrases: [
      { english: 'Thank you', local: '唔該 / 多謝 (M̀h gòi / Dō je)', pronunciation: 'mm-GOY / doh-JEH' },
      { english: 'Hello', local: '你好 (Néih hóu)', pronunciation: 'nay-HOH' },
      { english: 'How much?', local: '幾錢? (Géi chín?)', pronunciation: 'gay-CHEEN' },
      { english: 'Where is...?', local: '...喺邊度? (...hái bīn douh?)', pronunciation: '...hai bin-DOH' },
      { english: 'Thank you (Portuguese)', local: 'Obrigado/a', pronunciation: 'oh-bree-GAH-doh/dah' },
      { english: 'Help!', local: '救命! (Gau meng!)', pronunciation: 'gow-MENG' },
    ],
    tips: [
      'Macau is famous for egg tarts (Pastel de Nata) — try the original at Lord Stow\'s Bakery in Coloane Village.',
      'Gambling is legal and the casinos are world-class — set a firm budget before entering and stick to it.',
      'The Historic Centre of Macau is a UNESCO World Heritage Site — Ruins of St. Paul\'s is the iconic landmark.',
      'Macau is extremely safe and clean — one of the lowest crime rates in Asia.',
    ],
  },
  {
    name: 'China',
    flag: '🇨🇳',
    keywords: ['china', 'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'xian', "xi'an", 'hangzhou', 'suzhou', 'guilin', 'great wall', 'zhangjiajie'],
    timezone: 'Asia/Shanghai',
    currency: { code: 'CNY', name: 'Chinese Yuan Renminbi', symbol: '¥', tip: 'Bank of China and ICBC ATMs accept foreign Visa/Mastercard. Cash is still needed in rural areas and markets. Most urban China now uses WeChat Pay or Alipay — tourists can link a foreign card to WeChat Pay.' },
    visa: { status: 'required', note: 'Philippine passport holders require an L (tourist) visa. Apply at the Chinese Embassy or a CITS-authorized travel agency in Manila. Single entry valid for 30–90 days, multi-entry available. Processing typically takes 4–7 business days.' },
    emergency: { police: '110', ambulance: '120', fire: '119', tourist: '12301' },
    power: { plugs: ['Type A', 'Type C', 'Type I'], voltage: '220V / 50Hz', tip: 'Chinese sockets accept a wide variety of plug types including flat and angled pins. Many sockets are universal. A Type A or universal adapter covers most bases.' },
    transport: [
      'High-speed rail (CRH) connects virtually all major Chinese cities — book on 12306.cn or Trip.com.',
      'Didi is the dominant ride-hailing app and accepts international cards through its English version.',
      'Subway systems in Beijing and Shanghai are extensive, bilingual, and very affordable.',
      'Download offline maps (Maps.me or Baidu Maps) before arriving — Google Maps, Apple Maps may be unreliable.',
    ],
    language: 'Mandarin Chinese (Putonghua)',
    phrases: [
      { english: 'Thank you', local: '谢谢 (Xièxiè)', pronunciation: 'SHEH-sheh' },
      { english: 'Hello', local: '你好 (Nǐ hǎo)', pronunciation: 'nee-HOW' },
      { english: 'How much?', local: '多少钱? (Duōshǎo qián?)', pronunciation: 'dwoh-SHAO chyen' },
      { english: 'Where is...?', local: '...在哪里? (...zài nǎlǐ?)', pronunciation: 'ZAI nah-LEE' },
      { english: 'I don\'t understand', local: '我不明白 (Wǒ bù míngbái)', pronunciation: 'woh boo MING-bye' },
      { english: 'Help!', local: '救命! (Jiù mìng!)', pronunciation: 'jyoh-MING' },
    ],
    tips: [
      'Set up a VPN before arriving — Google, Facebook, Instagram, WhatsApp, and most Western apps are blocked.',
      'WeChat and Alipay are essential for payments in modern China. Link a foreign card to WeChat Pay as a tourist.',
      'Food safety standards in major cities are generally high. Tap water is not safe to drink anywhere in China.',
      'Learn a few Chinese characters for common signs — menus, subway signs, and street signs are often not in English outside major cities.',
    ],
  },
]

const VISA_CONFIG = {
  'visa-free': { label: 'Visa-Free', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
  'visa-on-arrival': { label: 'Visa on Arrival', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
  evisa: { label: 'eVisa', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
  required: { label: 'Visa Required', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', dot: 'bg-rose-500' },
}

function detectCountry(destination: string): CountryData | null {
  if (!destination?.trim()) return null
  const lower = destination.toLowerCase()
  return COUNTRIES.find(c => c.keywords.some(kw => lower.includes(kw))) ?? null
}

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 active:bg-muted/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-semibold">{title}</span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        }
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-border">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function CountryInfo() {
  const { trip } = useTrip()
  const destination = trip.tripInfo.destination ?? ''

  const autoDetected = useMemo(() => detectCountry(destination), [destination])
  const [selected, setSelected] = useState<CountryData | null>(autoDetected)
  const [copied, setCopied] = useState<string | null>(null)

  // Re-run auto-detect when destination changes, but don't override a manual selection
  const [hasManualSelection, setHasManualSelection] = useState(false)
  useMemo(() => {
    if (!hasManualSelection && autoDetected) {
      setSelected(autoDetected)
    }
  }, [autoDetected, hasManualSelection])

  const selectCountry = (c: CountryData) => {
    setSelected(c)
    setHasManualSelection(true)
  }

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const country = selected

  return (
    <div className="pb-8">
      <PageHeader
        title="Country Info"
        subtitle={country ? country.name : 'Select a country'}
        icon={Globe}
        iconColor="text-sky-600"
      />

      {/* Country chips */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {COUNTRIES.map(c => (
            <button
              key={c.name}
              onClick={() => selectCountry(c)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-sm shrink-0 transition-all active:scale-95 whitespace-nowrap',
                selected?.name === c.name
                  ? 'bg-sky-500 border-sky-500 text-white shadow-sm font-semibold'
                  : 'bg-card border-border text-muted-foreground hover:border-sky-300'
              )}
            >
              <span className="text-base leading-none">{c.flag}</span>
              <span className="text-xs font-medium">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {!country ? (
        <div className="px-4">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-base font-semibold text-foreground mb-1">Select a country</p>
            <p className="text-sm text-muted-foreground">
              Choose a destination above to see travel info, visa requirements, emergency numbers, and local tips.
            </p>
          </div>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {/* Country hero */}
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
            <span className="text-5xl leading-none">{country.flag}</span>
            <div>
              <p className="text-lg font-bold">{country.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{country.language}</p>
              <p className="text-xs text-muted-foreground">{country.timezone.replace('_', ' ')}</p>
            </div>
          </div>

          {/* Visa & Entry */}
          <Section
            title="Visa & Entry"
            icon={<Shield className="h-4 w-4 text-sky-600" />}
          >
            <div className="pt-3 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold',
                  VISA_CONFIG[country.visa.status].color
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', VISA_CONFIG[country.visa.status].dot)} />
                  {VISA_CONFIG[country.visa.status].label}
                </span>
                {country.visa.days && (
                  <Badge variant="secondary" className="text-xs">
                    Up to {country.visa.days} days
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{country.visa.note}</p>
              <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl px-3 py-2">
                <p className="text-xs text-sky-700 dark:text-sky-400 font-medium">
                  Visa status is for Philippine passport holders.
                </p>
              </div>
            </div>
          </Section>

          {/* Currency */}
          <Section
            title="Currency"
            icon={<CreditCard className="h-4 w-4 text-emerald-600" />}
          >
            <div className="pt-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-xl px-4 py-2 text-center">
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {country.currency.symbol}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-semibold uppercase tracking-wide">
                    {country.currency.code}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{country.currency.name}</p>
                  <p className="text-xs text-muted-foreground">{country.currency.code}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{country.currency.tip}</p>
            </div>
          </Section>

          {/* Emergency Numbers */}
          <Section
            title="Emergency Numbers"
            icon={<Phone className="h-4 w-4 text-rose-600" />}
          >
            <div className="pt-3 grid grid-cols-2 gap-2">
              {[
                { label: 'Police', number: country.emergency.police, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' },
                { label: 'Ambulance', number: country.emergency.ambulance, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' },
                { label: 'Fire', number: country.emergency.fire, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' },
                ...(country.emergency.tourist ? [{ label: 'Tourist Hotline', number: country.emergency.tourist, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800' }] : []),
              ].map(item => (
                <a
                  key={item.label}
                  href={`tel:${item.number}`}
                  className={cn(
                    'flex flex-col p-3 rounded-xl border active:scale-[0.97] transition-all',
                    item.bg
                  )}
                >
                  <p className={cn('text-xl font-bold tabular-nums', item.color)}>{item.number}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </a>
              ))}
            </div>
          </Section>

          {/* Power & Plugs */}
          <Section
            title="Power & Plugs"
            icon={<Plug className="h-4 w-4 text-amber-600" />}
          >
            <div className="pt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {country.power.plugs.map(plug => (
                  <span
                    key={plug}
                    className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-800"
                  >
                    {plug}
                  </span>
                ))}
                <span className="px-3 py-1 bg-muted text-muted-foreground text-xs font-semibold rounded-full border border-border">
                  {country.power.voltage}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{country.power.tip}</p>
            </div>
          </Section>

          {/* Getting Around */}
          <Section
            title="Getting Around"
            icon={<Car className="h-4 w-4 text-violet-600" />}
          >
            <ul className="pt-3 space-y-2">
              {country.transport.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </Section>

          {/* Key Phrases */}
          <Section
            title="Key Phrases"
            icon={<Globe className="h-4 w-4 text-teal-600" />}
          >
            <div className="pt-3 space-y-2">
              {country.phrases.map((phrase, i) => {
                const key = `phrase-${i}`
                const isCopied = copied === key
                return (
                  <div key={i} className="bg-muted/50 rounded-xl p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">{phrase.english}</p>
                      <p className="text-sm font-semibold text-foreground leading-tight">{phrase.local}</p>
                      <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium mt-0.5 italic">
                        {phrase.pronunciation}
                      </p>
                    </div>
                    <button
                      onClick={() => copyText(phrase.local, key)}
                      className={cn(
                        'shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90',
                        isCopied
                          ? 'bg-emerald-100 dark:bg-emerald-900/30'
                          : 'bg-background border border-border hover:bg-muted'
                      )}
                    >
                      {isCopied
                        ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                        : <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      }
                    </button>
                  </div>
                )
              })}
            </div>
          </Section>

          {/* Travel Tips */}
          <Section
            title="Travel Tips"
            icon={<Info className="h-4 w-4 text-rose-500" />}
          >
            <ul className="pt-3 space-y-3">
              {country.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-1 text-rose-500 text-xs font-bold shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </div>
  )
}
