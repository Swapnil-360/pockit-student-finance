import { Ionicons } from '@expo/vector-icons';

/**
 * Maps goal titles and categories to modern, contextually accurate Ionicons glyphs.
 * E.g., "Cox's bazar tour" -> 'airplane', "New Monitor" -> 'desktop-outline', "Online course" -> 'school-outline'.
 */
export const getGoalIconName = (
  title: string = '',
  category: string = ''
): keyof typeof Ionicons.glyphMap => {
  const q = `${title} ${category}`.toLowerCase();

  // Travel / Trip / Tour (Cox's Bazar, Sajek, Sylhet, Vacation, Flights, Sea, Beach)
  if (
    /tour|trip|travel|bazar|cox|sajek|sylhet|vacation|flight|hotel|ticket|sea|beach|resort|visit|journey/i.test(
      q
    )
  ) {
    return 'airplane';
  }

  // Gadgets / Tech / PC / Monitors / Laptop / Hardware
  if (
    /monitor|laptop|pc|computer|macbook|gpu|screen|desktop|tech|keyboard|mouse|gadget|processor|ram|headphone|airpod|audio/i.test(
      q
    )
  ) {
    return 'desktop-outline';
  }

  // Education / Courses / Books / Exams / Degrees
  if (
    /course|study|exam|book|tuition|class|school|university|degree|training|ielts|gre|admission|academic|skill/i.test(
      q
    )
  ) {
    return 'school-outline';
  }

  // Vehicles / Bikes / Cycles / Scooters
  if (/bike|cycle|motorcycle|ride|car|scooter|vehicle|honda|yamaha|suzuki/i.test(q)) {
    return 'bicycle-outline';
  }

  // Phones / Tablets / Smart Devices
  if (/phone|mobile|iphone|android|ipad|tablet|pixel|samsung|device/i.test(q)) {
    return 'phone-portrait-outline';
  }

  // Lifestyle / Clothes / Shopping / Fashion / Shoes
  if (/clothes|clothing|shopping|dress|shoes|watch|fashion|jacket|lifestyle|bag|sneaker/i.test(q)) {
    return 'shirt-outline';
  }

  // Health / Medical / Emergency
  if (/emergency|health|medical|doctor|hospital|medicine|clinic|dental/i.test(q)) {
    return 'medkit-outline';
  }

  // Housing / Mess / Furniture
  if (/home|rent|flat|room|mess|hostel|furniture|bed|chair|table/i.test(q)) {
    return 'home-outline';
  }

  // Celebrations / Gifts / Events
  if (/gift|party|birthday|anniversary|celebrate|treat/i.test(q)) {
    return 'gift-outline';
  }

  // Camera / Photography / Gear
  if (/camera|dslr|lens|photo|photography/i.test(q)) {
    return 'camera-outline';
  }

  // Savings / Investments / Financial Milestones
  if (/invest|stock|gold|crypto|deposit|savings|fund/i.test(q)) {
    return 'trending-up-outline';
  }

  // Default fallback
  return 'trophy-outline';
};

