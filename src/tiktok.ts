import axios from "axios";

const BASE_URL = 'https://api16-normal-v6.tiktokv.com/media/api/text/speech/invoke';

/**
 * Supported voices and their respective codes.
 */
export enum TTSVoice {
  // English
  /**
   * English AU - Female
   * Language: English (AU)
   */
  EnglishAUFemale = "en_au_001",

  /**
   * English AU - Male
   * Language: English (AU)
   */
  EnglishAUMale = "en_au_002",

  /**
   * English UK - Male 1
   * Language: English (UK)
   */
  EnglishUKMale1 = "en_uk_001",

  /**
   * English UK - Male 2
   * Language: English (UK)
   */
  EnglishUKMale2 = "en_uk_003",

  /**
   * English US - Female (Int. 1)
   * Language: English (US)
   */
  EnglishUSFemaleInt1 = "en_us_001",

  /**
   * English US - Female (Int. 2)
   * Language: English (US)
   */
  EnglishUSFemaleInt2 = "en_us_002",

  /**
   * English US - Male 1
   * Language: English (US)
   */
  EnglishUSMale1 = "en_us_006",

  /**
   * English US - Male 2
   * Language: English (US)
   */
  EnglishUSMale2 = "en_us_007",

  /**
   * English US - Male 3
   * Language: English (US)
   */
  EnglishUSMale3 = "en_us_009",

  /**
   * English US - Male 4
   * Language: English (US)
   */
  EnglishUSMale4 = "en_us_010",

  /**
   * Narrator
   * Language: English
   */
  Narrator = "en_male_narration",

  /**
   * Funny
   * Language: English
   */
  Funny = "en_male_funny",

  /**
   * Peaceful
   * Language: English
   */
  Peaceful = "en_female_emotional",

  /**
   * Serious
   * Language: English
   */
  Serious = "en_male_cody",

  // Disney
  /**
   * Ghost Face
   * Language: Disney
   */
  GhostFace = "en_us_ghostface",

  /**
   * Chewbacca
   * Language: Disney
   */
  Chewbacca = "en_us_chewbacca",

  /**
   * C3PO
   * Language: Disney
   */
  C3PO = "en_us_c3po",

  /**
   * Stitch
   * Language: Disney
   */
  Stitch = "en_us_stitch",

  /**
   * Stormtrooper
   * Language: Disney
   */
  Stormtrooper = "en_us_stormtrooper",

  /**
   * Rocket
   * Language: Disney
   */
  Rocket = "en_us_rocket",

  /**
   * Madame Leota
   * Language: Disney
   */
  MadameLeota = "en_female_madam_leota",

  /**
   * Ghost Host
   * Language: Disney
   */
  GhostHost = "en_male_ghosthost",

  /**
   * Pirate
   * Language: Disney
   */
  Pirate = "en_male_pirate",

  // French
  /**
   * French - Male 1
   * Language: French
   */
  FrenchMale1 = "fr_001",

  /**
   * French - Male 2
   * Language: French
   */
  FrenchMale2 = "fr_002",

  // Spanish
  /**
   * Spanish (Spain) - Male
   * Language: Spanish
   */
  SpanishSpainMale = "es_002",

  /**
   * Spanish MX - Male
   * Language: Spanish (Mexico)
   */
  SpanishMXMale = "es_mx_002",

  // Portuguese
  /**
   * Portuguese BR - Female 1
   * Language: Portuguese (Brazil)
   */
  PortugueseBRFemale1 = "br_001",

  /**
   * Portuguese BR - Female 2
   * Language: Portuguese (Brazil)
   */
  PortugueseBRFemale2 = "br_003",

  /**
   * Portuguese BR - Female 3
   * Language: Portuguese (Brazil)
   */
  PortugueseBRFemale3 = "br_004",

  /**
   * Portuguese BR - Male
   * Language: Portuguese (Brazil)
   */
  PortugueseBRMale = "br_005",

  // German
  /**
   * German - Female
   * Language: German
   */
  GermanFemale = "de_001",

  /**
   * German - Male
   * Language: German
   */
  GermanMale = "de_002",

  // Indonesian
  /**
   * Indonesian - Female
   * Language: Indonesian
   */
  IndonesianFemale = "id_001",

  // Japanese
  /**
   * Japanese - Female 1
   * Language: Japanese
   */
  JapaneseFemale1 = "jp_001",

  /**
   * Japanese - Female 2
   * Language: Japanese
   */
  JapaneseFemale2 = "jp_003",

  /**
   * Japanese - Female 3
   * Language: Japanese
   */
  JapaneseFemale3 = "jp_005",

  /**
   * Japanese - Male
   * Language: Japanese
   */
  JapaneseMale = "jp_006",

  // Korean
  /**
   * Korean - Male 1
   * Language: Korean
   */
  KoreanMale1 = "kr_002",

  /**
   * Korean - Female
   * Language: Korean
   */
  KoreanFemale = "kr_003",

  /**
   * Korean - Male 2
   * Language: Korean
   */
  KoreanMale2 = "kr_004",

  // Other
  /**
   * Alto
   * Language: English
   */
  Alto = "en_female_f08_salut_damour",

  /**
   * Tenor
   * Language: English
   */
  Tenor = "en_male_m03_lobby",

  /**
   * Sunshine Soon
   * Language: English
   */
  SunshineSoon = "en_male_m03_sunshine_soon",

  /**
   * Warmy Breeze
   * Language: English
   */
  WarmyBreeze = "en_female_f08_warmy_breeze",

  /**
   * Glorious
   * Language: English
   */
  Glorious = "en_female_ht_f08_glorious",

  /**
   * It Goes Up
   * Language: English
   */
  ItGoesUp = "en_male_sing_funny_it_goes_up",

  /**
   * Chipmunk
   * Language: English
   */
  Chipmunk = "en_male_m2_xhxs_m03_silly",

  /**
   * Dramatic
   * Language: English
   */
  Dramatic = "en_female_ht_f08_wonderful_world",
}

function handleStatusError(statusCode: number) {
  switch (statusCode) {
      case 1:
          throw new Error(`Your TikTok session id might be invalid or expired. Try getting a new one. status_code: ${statusCode}`);
      case 2:
          throw new Error(`The provided text is too long. status_code: ${statusCode}`);
      case 4:
          throw new Error(`Invalid speaker, please check the list of valid speaker values. status_code: ${statusCode}`);
      case 5:
          throw new Error(`No session id found. status_code: ${statusCode}`);
      default:
          throw new Error(`Unknown error. status_code: ${statusCode}`);
  }
}


/**
 * @param text The text to be converted to speech.
 * @param voice The voice to use for the speech.
 * @param sessionId TikTok session ID for authentication. (https://github.com/Steve0929/tiktok-tts/tree/main#get-tiktok-session-id-)
 *                           To obtain this ID, follow these steps:
 *                           1. Install the Cookie Editor extension for your browser.
 *                           2. Log in to TikTok Web.
 *                           3. While on TikTok Web, open the extension and locate the 'sessionid'.
 *                           4. Copy the sessionid value (an alphanumeric string).
  * @returns A base64 string with the encoded voice in mp3.
  */
export async function requestTTS(text: string, voice: TTSVoice, sessionId: string): Promise<string> {
  const URL = `${BASE_URL}/?text_speaker=${voice}&req_text=${text}&speaker_map_type=0&aid=1233`;
  const headers = {
    'User-Agent': 'com.zhiliaoapp.musically/2022600030 (Linux; U; Android 7.1.2; es_ES; SM-G988N; Build/NRD90M;tt-ok/3.12.13.1)',
    'Cookie': `sessionid=${sessionId}`,
    'Accept-Encoding': 'gzip,deflate,compress'
  }

  try {
    const result = await axios.post(URL, null, { headers });

    const statusCode = result?.data?.status_code;
    if (statusCode !== 0) {
      handleStatusError(statusCode);
    }

    const encodedVoice = result?.data?.data?.v_str;

    /// return Buffer.from(encodedVoice, 'base64');
    return encodedVoice;
  } catch (err) {
    throw new Error(`tiktok-tts ${err}`);
  }
}