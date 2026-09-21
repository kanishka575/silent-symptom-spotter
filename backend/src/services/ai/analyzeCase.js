const demoScenarios = {
  "dramatic-low-risk": {
    transcript:
      "Meri haalat bahut kharab hai. Kal se thoda bukhar tha, par ab theek lag raha hai.",
    language: "Hindi + regional dialect",
    symptoms: [
      { name: "Fever", duration: "1 day", severity: "Mild" },
      { name: "Weakness", duration: "1 day", severity: "Low" },
    ],
    contextAnalysis: {
      phrase: "Meri haalat bahut kharab hai.",
      phraseIntensity: "High",
      clinicalEvidence: "Low",
      regionalPhraseContext: "Common expressive phrase",
      voiceIndicators: "Low",
      interpretation:
        "The language is dramatic, but there is little evidence of immediate medical danger.",
    },
    audioQuality: 82,
    confidence: 64,
    triageLevel: "ROUTINE",
    triageReason:
      "Dramatic phrasing with limited clinical evidence; human verification recommended.",
    followUpQuestions: [
      "Is the patient currently struggling to breathe or having severe chest pain?",
      "Is the patient alert and responsive?",
    ],
  },
  urgent: {
    transcript:
      "Kab se bukhar hai, sir dard bhi ho raha hai, aur thoda saans chadh raha hai.",
    language: "Hindi + Hinglish",
    symptoms: [
      { name: "Fever", duration: "2 days", severity: "Moderate" },
      { name: "Breathing difficulty", duration: "1 day", severity: "Moderate" },
      { name: "Headache", duration: "2 days", severity: "Moderate" },
    ],
    contextAnalysis: {
      phrase: "Saans chadh raha hai",
      phraseIntensity: "Moderate",
      clinicalEvidence: "Moderate",
      regionalPhraseContext: "Contextually meaningful symptom phrase",
      voiceIndicators: "Moderate",
      interpretation:
        "Breath-related symptoms and worsening condition need timely clinical review.",
    },
    audioQuality: 76,
    confidence: 81,
    triageLevel: "URGENT",
    triageReason:
      "Persistent symptoms with breathing difficulty require prompt healthcare review.",
    followUpQuestions: [
      "Did the breathing difficulty worsen over the day?",
      "Is the patient able to speak in full sentences without gasping?",
    ],
  },
  emergency: {
    transcript:
      "Saans lene mein bahut dikkat ho rahi hai. Chhati mein dard hai aur patient thak gaya hai.",
    language: "Hindi + local dialect",
    symptoms: [
      { name: "Breathing difficulty", duration: "Hours", severity: "Severe" },
      { name: "Chest pain", duration: "Hours", severity: "Moderate" },
      { name: "Weakness", duration: "Hours", severity: "Severe" },
    ],
    contextAnalysis: {
      phrase: "Saans lene mein bahut dikkat ho rahi hai.",
      phraseIntensity: "High",
      clinicalEvidence: "Strong",
      regionalPhraseContext: "Direct symptom phrase",
      voiceIndicators: "High",
      interpretation:
        "Severe respiratory concern with related symptoms indicates high urgency.",
    },
    audioQuality: 88,
    confidence: 91,
    triageLevel: "EMERGENCY",
    triageReason:
      "Severe breathing difficulty and chest pain indicate potential emergency.",
    followUpQuestions: [
      "Is the patient conscious and responsive?",
      "Is the patient currently struggling to breathe severely?",
    ],
  },
};

export function analyzeCase({
  transcript = "",
  selectedDemo = "dramatic-low-risk",
  audioQuality = 80,
}) {
  const normalized = (transcript || "").toLowerCase();

  if (selectedDemo && demoScenarios[selectedDemo]) {
    return {
      ...demoScenarios[selectedDemo],
      audioQuality,
      transcript: transcript || demoScenarios[selectedDemo].transcript,
    };
  }

  if (
    normalized.includes("saans") ||
    normalized.includes("breathing") ||
    normalized.includes("chest pain")
  ) {
    return {
      transcript: transcript || "Saans lene mein dikkat ho rahi hai.",
      language: "Hindi + local dialect",
      symptoms: [
        { name: "Breathing difficulty", duration: "Hours", severity: "Severe" },
        { name: "Chest pain", duration: "Hours", severity: "Moderate" },
      ],
      contextAnalysis: {
        phrase: "Saans lene mein dikkat ho rahi hai.",
        phraseIntensity: "High",
        clinicalEvidence: "Strong",
        regionalPhraseContext: "Direct symptom phrase",
        voiceIndicators: "High",
        interpretation:
          "Severe respiratory concern with related symptoms requires immediate review.",
      },
      audioQuality: Math.max(68, audioQuality),
      confidence: 91,
      triageLevel: "EMERGENCY",
      triageReason: "Severe breathing difficulty and chest pain were detected.",
      followUpQuestions: [
        "Is the patient currently conscious and responsive?",
        "Is the breathing difficulty worsening rapidly?",
      ],
    };
  }

  if (
    normalized.includes("bukhar") ||
    normalized.includes("sir dard") ||
    normalized.includes("sardi")
  ) {
    return {
      transcript: transcript || "Kab se bukhar hai, sir dard bhi ho raha hai.",
      language: "Hindi + Hinglish",
      symptoms: [
        { name: "Fever", duration: "2 days", severity: "Moderate" },
        { name: "Headache", duration: "2 days", severity: "Moderate" },
      ],
      contextAnalysis: {
        phrase: "Bukhar aur sir dard",
        phraseIntensity: "Moderate",
        clinicalEvidence: "Moderate",
        regionalPhraseContext: "Contextually meaningful symptom phrase",
        voiceIndicators: "Moderate",
        interpretation:
          "Symptoms need timely PHC review, though not an automatic emergency.",
      },
      audioQuality: Math.max(72, audioQuality),
      confidence: 80,
      triageLevel: "URGENT",
      triageReason: "Persistent fever and headache need healthcare review.",
      followUpQuestions: [
        "Did the symptoms worsen over the day?",
        "Is the patient able to eat and drink normally?",
      ],
    };
  }

  return {
    transcript: transcript || "Meri haalat bahut kharab hai.",
    language: "Hindi + regional dialect",
    symptoms: [
      { name: "Low-grade fever", duration: "1 day", severity: "Mild" },
    ],
    contextAnalysis: {
      phrase: "Meri haalat bahut kharab hai.",
      phraseIntensity: "High",
      clinicalEvidence: "Low",
      regionalPhraseContext: "Common expressive phrase",
      voiceIndicators: "Low",
      interpretation:
        "The phrase is dramatic but not clinically specific; verification is required.",
    },
    audioQuality: Math.max(70, audioQuality),
    confidence: 66,
    triageLevel: "ROUTINE",
    triageReason:
      "No direct medical danger detected from the current information.",
    followUpQuestions: [
      "Is there any breathing difficulty or severe pain?",
      "Is the patient alert and responsive?",
    ],
  };
}
