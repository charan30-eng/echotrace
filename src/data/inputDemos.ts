export interface TextDemoItem {
  id: string;
  title: string;
  category: string;
  claim: string;
  description: string;
  expectedScore: number;
  expectedStatus: string;
}

export interface UrlDemoItem {
  id: string;
  url: string;
  title: string;
  category: string;
  domain: string;
  claim: string;
  type: 'Official Portal' | 'Student Media' | 'External News Blog';
  expectedScore: number;
  expectedStatus: string;
}

export type SocialPlatform = 'telegram' | 'x' | 'reddit' | 'instagram';

export interface SocialDemoItem {
  id: string;
  platform: SocialPlatform;
  author: string;
  handleOrChannel: string;
  avatarEmoji: string;
  timestamp: string;
  metadata: string;
  postText: string;
  extractedClaim: string;
  expectedScore: number;
  expectedStatus: string;
}

// ==========================================
// 1. TEXT DEMOS
// ==========================================
export const TEXT_DEMOS: TextDemoItem[] = [
  {
    id: 'text-1',
    title: 'Rain Holiday Announcement',
    category: 'College Closure',
    claim: 'SRM College is closed tomorrow due to heavy rain.',
    description: 'Viral peer message claiming all campuses are suspended tomorrow.',
    expectedScore: 18,
    expectedStatus: 'Low credibility',
  },
  {
    id: 'text-2',
    title: 'Internal Exam Postponement',
    category: 'Exam Schedule',
    claim: 'Tomorrow’s internal exam has been postponed to Monday.',
    description: 'Circulated message regarding postponement of slot 2 assessments.',
    expectedScore: 24,
    expectedStatus: 'Low credibility',
  },
  {
    id: 'text-3',
    title: 'TCS Placement Drive Freeze',
    category: 'Placement Drive',
    claim: 'The TCS placement drive has been cancelled due to hiring freeze.',
    description: 'Rumor regarding cancellation of mass campus recruitment drive.',
    expectedScore: 22,
    expectedStatus: 'Low credibility',
  },
  {
    id: 'text-4',
    title: 'Milan Cultural Fest Weather Delay',
    category: 'College Event',
    claim: 'SRM cultural fest has been cancelled because of weather.',
    description: 'Speculation regarding cancellation of the annual cultural festival.',
    expectedScore: 35,
    expectedStatus: 'Needs review',
  },
  {
    id: 'text-5',
    title: 'Campus Bus Fleet Suspension',
    category: 'Transport',
    claim: 'SRM college buses will not operate tomorrow morning.',
    description: 'Claim that college buses will not run due to local driver strike.',
    expectedScore: 16,
    expectedStatus: 'Refuted',
  },
];

// ==========================================
// 2. URL DEMOS
// ==========================================
export const URL_DEMOS: UrlDemoItem[] = [
  {
    id: 'url-1',
    url: 'https://evarsity.srmist.edu.in/announcements/circular-monsoon-rain-advisory-2026.html',
    title: 'Registrar Rain Advisory Notice',
    category: 'Official Circular',
    domain: 'evarsity.srmist.edu.in',
    claim: 'Claim extracted from https://evarsity.srmist.edu.in/announcements/circular-monsoon-rain-advisory-2026.html: SRM Registrar confirms regular class operations continue as scheduled.',
    type: 'Official Portal',
    expectedScore: 88,
    expectedStatus: 'High credibility',
  },
  {
    id: 'url-2',
    url: 'https://examinations.srmist.edu.in/timetable/internal-assessment-oct-2026-schedule.pdf',
    title: 'Controller of Exams Timetable Bulletin',
    category: 'Examination Schedule',
    domain: 'examinations.srmist.edu.in',
    claim: 'Claim extracted from https://examinations.srmist.edu.in/timetable/internal-assessment-oct-2026-schedule.pdf: Internal exams continue as per original published timetable.',
    type: 'Official Portal',
    expectedScore: 92,
    expectedStatus: 'High credibility',
  },
  {
    id: 'url-3',
    url: 'https://srm-studenttimes.org/articles/postponement-internal-exams-slot2-rumor',
    title: 'Student Blog: Exam Postponement Speculation',
    category: 'Student Media',
    domain: 'srm-studenttimes.org',
    claim: 'Claim extracted from https://srm-studenttimes.org/articles/postponement-internal-exams-slot2-rumor: Tomorrow’s internal exam reportedly postponed to Monday due to schedule clashes.',
    type: 'Student Media',
    expectedScore: 34,
    expectedStatus: 'Needs review',
  },
  {
    id: 'url-4',
    url: 'https://campusrecruitment.net/posts/srm-tcs-mass-drive-reporting-schedule',
    title: 'External Blog: TCS Recruitment Drive Status',
    category: 'Placement News',
    domain: 'campusrecruitment.net',
    claim: 'Claim extracted from https://campusrecruitment.net/posts/srm-tcs-mass-drive-reporting-schedule: TCS campus placement drive cancelled for SRM students.',
    type: 'External News Blog',
    expectedScore: 28,
    expectedStatus: 'Low credibility',
  },
  {
    id: 'url-5',
    url: 'https://transport.srmist.edu.in/routes/daily-bus-dispatch-status-october',
    title: 'Transport Office: Fleet Status Advisory',
    category: 'Bus Operations',
    domain: 'transport.srmist.edu.in',
    claim: 'Claim extracted from https://transport.srmist.edu.in/routes/daily-bus-dispatch-status-october: SRM college bus routes operational across all Chennai zones.',
    type: 'Official Portal',
    expectedScore: 89,
    expectedStatus: 'High credibility',
  },
];

// ==========================================
// 3. SOCIAL MEDIA POST DEMOS (BY PLATFORM)
// ==========================================
export const SOCIAL_DEMOS: Record<
  'telegram' | 'x' | 'reddit' | 'instagram',
  SocialDemoItem[]
> = {
  telegram: [
    {
      id: 'tg-1',
      platform: 'telegram',
      author: 'SRM Unofficial Bulletin',
      handleOrChannel: '@srm_exams_updates (14.2K members)',
      avatarEmoji: '📢',
      timestamp: 'Today at 10:20 AM',
      metadata: '14,280 views · 482 shares',
      postText:
        '📢 [EXAMINATION UPDATE UNOFFICIAL] Tomorrow’s slot 2 internal exam has been deferred by the Controller of Examinations and moved to Monday. Revised pdf schedule uploading to portal tonight. Do not panic, start studying for Monday exam!',
      extractedClaim: 'Tomorrow’s internal exam has been postponed to Monday.',
      expectedScore: 24,
      expectedStatus: 'Low credibility',
    },
    {
      id: 'tg-2',
      platform: 'telegram',
      author: 'Placement Discussion Forum',
      handleOrChannel: '@srm_placements_2026',
      avatarEmoji: '💼',
      timestamp: 'Today at 11:05 AM',
      metadata: '9,120 views · 310 forwards',
      postText:
        '🚨 URGENT NOTICE FOR SHORTLISTED STUDENTS: The TCS placement drive scheduled for tomorrow has been cancelled by TCS HR due to global hiring restrictions. Placement office calling emergency meeting. Check your spam mail!',
      extractedClaim: 'The TCS placement drive has been cancelled due to hiring freeze.',
      expectedScore: 22,
      expectedStatus: 'Low credibility',
    },
  ],

  x: [
    {
      id: 'x-1',
      platform: 'x',
      author: 'Campus Student Pulse',
      handleOrChannel: '@srm_student_voice',
      avatarEmoji: '🐦',
      timestamp: '8:42 AM · Oct 3, 2026',
      metadata: '3.4K Views · 89 Reposts · 240 Likes',
      postText:
        '@SRM_University Is it true that all campus operations and classes are suspended tomorrow? Hearing rumors on public student channels that heavy rain holiday applies to SRM Kattankulathur too. Please confirm urgently @SRM_Admissions @chennaicorp #SRMCollege #ChennaiRains',
      extractedClaim: 'SRM College is closed tomorrow due to heavy rain.',
      expectedScore: 20,
      expectedStatus: 'Low credibility',
    },
    {
      id: 'x-2',
      platform: 'x',
      author: 'Chennai Tech Student Wire',
      handleOrChannel: '@chennai_tech_wire',
      avatarEmoji: '⚡',
      timestamp: '11:15 AM · Oct 3, 2026',
      metadata: '6.8K Views · 112 Reposts · 310 Likes',
      postText:
        'Alert: Widespread reports that the main Kattankulathur substation has tripped and all campus labs will remain shut for 48 hours. Can @SRM_University maintenance verify? Students have project submission deadlines today! #SRMCampus',
      extractedClaim: 'All campus labs will remain shut for 48 hours due to power outage.',
      expectedScore: 28,
      expectedStatus: 'Low credibility',
    },
  ],

  reddit: [
    {
      id: 'red-1',
      platform: 'reddit',
      author: 'u/hostel_survivor_99',
      handleOrChannel: 'r/SRM_College · 15.8k members',
      avatarEmoji: '🤖',
      timestamp: 'Posted 2 hours ago by u/hostel_survivor_99',
      metadata: '94% Upvoted · 84 comments · 12 awards',
      postText:
        '[Megathread] Are SRM buses actually running tomorrow morning? Drivers on the Tambaram and Velachery route groups are saying the bus yard is waterlogged and operations are suspended. Did anyone get official email from the transport office yet?',
      extractedClaim: 'SRM college buses will not operate tomorrow morning.',
      expectedScore: 19,
      expectedStatus: 'Refuted',
    },
    {
      id: 'red-2',
      platform: 'reddit',
      author: 'u/milan_lead_2026',
      handleOrChannel: 'r/SRM_College · 15.8k members',
      avatarEmoji: '🎭',
      timestamp: 'Posted 3 hours ago by u/milan_lead_2026',
      metadata: '132 Upvotes · 62 comments',
      postText:
        'PSA: Rumor floating around that the SRM cultural fest has been cancelled due to weather warnings. Student council members saying stage construction halted. Can anyone from the cultural committee confirm if Milan 2026 is happening as scheduled?',
      extractedClaim: 'SRM cultural fest has been cancelled because of weather.',
      expectedScore: 32,
      expectedStatus: 'Needs review',
    },
  ],

  instagram: [
    {
      id: 'ig-1',
      platform: 'instagram',
      author: 'SRM Confessions Daily',
      handleOrChannel: '@srm_confessions_daily',
      avatarEmoji: '📸',
      timestamp: 'Story & Reel · 1 hour ago',
      metadata: '18.4K Followers · 1.2K Shares',
      postText:
        '🚨 Notice circulating on hostel broadcast groups that all hostel gates will close strictly at 6:00 PM starting tonight with biometrics locked till morning due to security audits. Warden office hasn’t issued official circular yet. Beware of unverified forwards!',
      extractedClaim: 'Hostel gates will close strictly at 6:00 PM with biometrics locked.',
      expectedScore: 23,
      expectedStatus: 'Low credibility',
    },
    {
      id: 'ig-2',
      platform: 'instagram',
      author: 'SRM Sports & Gym Society',
      handleOrChannel: '@srm_sports_official_unofficial',
      avatarEmoji: '🏆',
      timestamp: 'Story Post · 45 mins ago',
      metadata: '12.1K Followers · 890 Shares',
      postText:
        'Inter-collegiate cricket and football tournament scheduled at the central stadium has reportedly been called off for the weekend due to pitch maintenance. Waiting for directorate of sports confirmation circular!',
      extractedClaim: 'Inter-collegiate tournament at central stadium has been called off.',
      expectedScore: 38,
      expectedStatus: 'Needs review',
    },
  ],
};
