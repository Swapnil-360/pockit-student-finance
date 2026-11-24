/**
 * TakaTrack AI — Motivational Student Money Management Quotes
 * Rotating pool of relatable bilingual quotes in Bengali & English.
 */

export interface MotivationalQuote {
  id: number;
  bn: string;
  en: string;
  authorBn?: string;
  authorEn?: string;
}

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  {
    id: 1,
    bn: 'মাসের শুরুতে রাজা, আর শেষে ফকির—এই চক্র ভাঙার সময় এখনই!',
    en: 'Break the cycle of living like a king on the 1st and struggling by the 25th!',
    authorBn: 'স্মার্ট মানি নীতি',
    authorEn: 'Smart Money Rule',
  },
  {
    id: 2,
    bn: 'প্রতিদিনের ১০০ টাকার অপ্রয়োজনীয় খরচ, মাস শেষে ৩,০০০ টাকার বড় আফসোস।',
    en: 'An unnecessary Tk 100 daily spend turns into a Tk 3,000 regret at month-end.',
    authorBn: 'দৈনিক সঞ্চয় সত্য',
    authorEn: 'Daily Habit Truth',
  },
  {
    id: 3,
    bn: 'টাকা বাঁচানো মানে কিপ্টেমি নয়, বরং নিজের ভবিষ্যতের জন্য স্বাধীনতা তৈরি করা।',
    en: "Saving money isn't about being cheap; it's about buying your own freedom.",
    authorBn: 'আর্থিক স্বনির্ভরতা',
    authorEn: 'Financial Freedom',
  },
  {
    id: 4,
    bn: 'বাজেট আপনাকে খরচ করতে বাধা দেয় না, বরং জরুরি সময়ে বিপদে পড়া থেকে বাঁচায়।',
    en: "A budget doesn't limit your freedom; it saves you from month-end panic.",
    authorBn: 'বাজেট সুরক্ষা',
    authorEn: 'Budget Safety',
  },
  {
    id: 5,
    bn: 'হিসাব না রাখলে টাকা কোথায় যায় টের পাওয়া যায় না—আজকের খরচটা এখনই টুকে রাখুন।',
    en: "If you don't track it, you can't control it—log today's spend now.",
    authorBn: 'লেজার অনুশাসন',
    authorEn: 'Ledger Discipline',
  },
  {
    id: 6,
    bn: 'ক্যাম্পাস জীবনের সেরা সঞ্চয় শুরু হয় চায়ের আড্ডা ও ফুডপান্ডায় অপ্রয়োজনীয় লাগাম টেনে।',
    en: 'The greatest campus savings start by trimming impulsive tea stall hangs and delivery apps.',
    authorBn: 'ক্যাম্পাস লাইফ হ্যাক',
    authorEn: 'Campus Life Hack',
  },
  {
    id: 7,
    bn: 'নীলক্ষেতের পুরোনো বই আর ক্যান্টিনের মেস খাবার—স্মার্ট শিক্ষার্থীর বড় সঞ্চয় হাতিয়ার।',
    en: "Used books from Nilkhet and canteen meals—the smart student's secret weapon for surplus.",
    authorBn: 'সাশ্রয়ী শিক্ষার্থী',
    authorEn: 'Frugal Scholar',
  },
  {
    id: 8,
    bn: 'বন্ধুর কাছ থেকে ধার নেওয়া সহজ, কিন্তু পরিশোধের সময় মানসিক চাপ অনেক গুণ।',
    en: 'Borrowing from friends is effortless in the moment; the stress of repayment is tenfold.',
    authorBn: 'ঋণমুক্ত জীবন',
    authorEn: 'Debt-Free Living',
  },
  {
    id: 9,
    bn: 'জরুরি ফান্ড না থাকলে একটি অপ্রত্যাশিত খরচ পুরো মাসের বাজেট ভেঙে চুরমার করে দেয়।',
    en: 'Without a cushion, a single unexpected shock shatters your entire monthly peace.',
    authorBn: 'জরুরি তহবিল',
    authorEn: 'Emergency Shield',
  },
  {
    id: 10,
    bn: 'ছোট ছোট হিসাবই মাস শেষে বড় স্বস্তি এনে দেয়—প্রতিটি টাকার মূল্য জানুন।',
    en: 'Consistent small tracking yields massive month-end peace of mind—respect every Taka.',
    authorBn: 'পকেট সচেতনতা',
    authorEn: 'Pocket Awareness',
  },
  {
    id: 11,
    bn: 'আগে সঞ্চয়ের অংশ সরিয়ে রাখুন, তারপর বাকি টাকা দিয়ে মাস চালানোর পরিকল্পনা করুন।',
    en: 'Pay yourself first: set aside savings immediately, then budget the remainder.',
    authorBn: 'পে ইয়োরসেলফ ফার্স্ট',
    authorEn: 'Pay Yourself First',
  },
  {
    id: 12,
    bn: 'মাস শেষে বাড়ি থেকে টাকা চাওয়ার লজ্জা থেকে বাঁচতে প্রতিদিনের সীমা মেনে চলুন।',
    en: 'Avoid the awkward mid-month distress call to parents: respect your daily safe limit.',
    authorBn: 'আত্মমর্যাদা ও বাজেট',
    authorEn: 'Dignity & Budget',
  },
  {
    id: 13,
    bn: 'আর্থিক শৃঙ্খলা আপনার জীবনকে সীমাবদ্ধ করে না, বরং সত্যিকারের স্বাধীনতা এনে দেয়।',
    en: 'Financial discipline doesn’t restrict your life; it buys you genuine peace of mind.',
    authorBn: 'শৃঙ্খলা ও স্বস্তি',
    authorEn: 'Discipline & Peace',
  },
  {
    id: 14,
    bn: 'আজকের ছোট আত্মনিয়ন্ত্রণই কালকের বড় স্বপ্ন পূরণের আসল শক্তি।',
    en: 'Small daily self-control is the exact engine that funds your biggest future goals.',
    authorBn: 'কম্পাউন্ড গ্রোথ',
    authorEn: 'Compound Habit',
  },
  {
    id: 15,
    bn: 'অর্থ উপার্জনের চেয়ে তা ধরে রাখার এবং সঠিক জায়গায় ব্যয় করার ক্ষমতাই আসল দক্ষতা।',
    en: 'Wealth is not just about what you receive; it is about masterfully keeping what you have.',
    authorBn: 'আর্থিক দূরদর্শিতা',
    authorEn: 'Financial Mastery',
  },
  {
    id: 16,
    bn: 'অস্থায়ী দেখানোর মোহে খরচ না করে দীর্ঘমেয়াদী মানসিক শান্তিতে বিনিয়োগ করুন।',
    en: 'Never spend to impress for a moment at the expense of your month-end calm.',
    authorBn: 'শান্তিময় সঞ্চয়',
    authorEn: 'Mindful Living',
  },
  {
    id: 17,
    bn: 'প্রতিটি খরচের আগে এক সেকেন্ড ভাবুন: এটি কি সত্যিই দরকার, নাকি শুধুই ক্ষণিকের ইচ্ছা?',
    en: 'Pause for one second before tapping pay: is this essential, or just an impulse passing by?',
    authorBn: 'সচেতন ব্যয়',
    authorEn: 'Conscious Spend',
  },
  {
    id: 18,
    bn: 'আপনার পকেট মানির নিয়ন্ত্রণ আপনার হাতে—হিসাব রাখুন, আত্মবিশ্বাস নিয়ে বাঁচুন।',
    en: 'Master your pocket allowance with clarity: track intentionally, live with quiet confidence.',
    authorBn: 'আত্মবিশ্বাস',
    authorEn: 'Inner Confidence',
  },
];

/**
 * Returns a random quote from the pool.
 */
export function getRandomQuote(): MotivationalQuote {
  const index = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  return MOTIVATIONAL_QUOTES[index];
}

/**
 * Returns the next quote in cyclic order.
 */
export function getNextQuote(currentId: number): MotivationalQuote {
  const currentIndex = MOTIVATIONAL_QUOTES.findIndex((q) => q.id === currentId);
  const nextIndex = (currentIndex + 1) % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[nextIndex];
}

