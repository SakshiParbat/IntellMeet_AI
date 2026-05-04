// routes/meetings.js - Meeting CRUD Routes
const express = require('express');
const router = express.Router();
const { Meeting } = require('../models/models');
const { protect } = require('./auth');

// ─── MEETING CREATE ───
// POST /api/meetings
router.post('/', protect, async (req, res) => {
  try {
    const { title, settings } = req.body;

    const meeting = await Meeting.create({
      title: title || 'New IntellMeet Meeting',
      host: req.user._id,
      participants: [{
        user: req.user._id,
        role: 'host'
      }],
      settings: settings || {}
    });

    await meeting.populate('host', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Meeting create ho gayi! Join link share karein.',
      meeting,
      joinLink: `${process.env.CLIENT_URL}/meeting/${meeting.meetingId}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── JOIN MEETING ───
// POST /api/meetings/:meetingId/join
router.post('/:meetingId/join', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting nahi mili. Meeting ID check karein.'
      });
    }

    if (meeting.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'Yeh meeting khatam ho chuki hai'
      });
    }

    // Password check karo agar required ho
    if (meeting.settings.requirePassword) {
      const { password } = req.body;
      if (password !== meeting.settings.password) {
        return res.status(403).json({
          success: false,
          message: 'Meeting password galat hai'
        });
      }
    }

    // Max participants check
    const activeParticipants = meeting.participants.filter(p => !p.leftAt).length;
    if (activeParticipants >= meeting.settings.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Meeting full hai! Maximum participants pahunch gaye.'
      });
    }

    // Already joined check
    const alreadyJoined = meeting.participants.find(
      p => p.user.toString() === req.user._id.toString() && !p.leftAt
    );

    if (!alreadyJoined) {
      meeting.participants.push({
        user: req.user._id,
        role: 'participant'
      });
    }

    if (meeting.status === 'scheduled') {
      meeting.status = 'active';
      meeting.startedAt = new Date();
    }

    await meeting.save();
    await meeting.populate('host', 'name email avatar');
    await meeting.populate('participants.user', 'name email avatar');

    res.json({
      success: true,
      message: 'Meeting mein shamil ho gaye! 🎉',
      meeting
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET ALL MEETINGS ───
// GET /api/meetings
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const meetings = await Meeting.find({
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id }
      ]
    })
      .populate('host', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Meeting.countDocuments({
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id }
      ]
    });

    res.json({
      success: true,
      meetings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET SINGLE MEETING ───
// GET /api/meetings/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('host', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .populate('actionItems.assignee', 'name email avatar');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting nahi mili' });
    }

    res.json({ success: true, meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── END MEETING ───
// PATCH /api/meetings/:id/end
router.patch('/:id/end', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting nahi mili' });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Sirf host hi meeting band kar sakta hai'
      });
    }

    meeting.status = 'ended';
    meeting.endedAt = new Date();
    meeting.duration = Math.round((meeting.endedAt - meeting.startedAt) / 60000);

    // Sabke leftAt set karo
    meeting.participants.forEach(p => {
      if (!p.leftAt) p.leftAt = new Date();
    });

    await meeting.save();

    res.json({
      success: true,
      message: 'Meeting khatam ho gayi. AI summary generate ho rahi hai...',
      meeting
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

// ─────────────────────────────────────────────
// routes/ai.js - AI Features
const aiRouter = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── AI MEETING SUMMARY ───
// POST /api/ai/summarize
aiRouter.post('/summarize', protect, async (req, res) => {
  try {
    const { meetingId, transcript } = req.body;

    if (!transcript || transcript.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transcript zaroori hai summary ke liye'
      });
    }

    // Transcript text format karo
    const transcriptText = transcript
      .map(t => `${t.speakerName}: ${t.text}`)
      .join('\n');

    // OpenAI se summary lao
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Tum ek expert meeting analyst ho. Meeting transcript padhke:
1. Ek concise summary (3-4 sentences) do
2. Key points bullet points mein do
3. Action items detect karo (owner ka naam, kaam, deadline agar mention ho)
4. Overall meeting ka sentiment batao (positive/neutral/negative)

JSON format mein jawab do:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "actionItems": [{"text": "...", "assignee": "...", "dueDate": "..."}],
  "sentiment": "positive/neutral/negative"
}`
        },
        {
          role: 'user',
          content: `Meeting transcript:\n\n${transcriptText}`
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const aiResult = JSON.parse(completion.choices[0].message.content);

    // Meeting update karo
    if (meetingId) {
      await Meeting.findByIdAndUpdate(meetingId, {
        aiSummary: {
          text: aiResult.summary,
          keyPoints: aiResult.keyPoints,
          sentiment: aiResult.sentiment,
          generatedAt: new Date()
        }
      });
    }

    res.json({
      success: true,
      message: 'AI summary ready hai! 🤖',
      summary: aiResult
    });
  } catch (error) {
    console.error('AI summarize error:', error);
    res.status(500).json({
      success: false,
      message: 'AI summary generate karne mein error aaya. Dobara try karein.'
    });
  }
});

// ─── LIVE TRANSCRIPTION ───
// POST /api/ai/transcribe (Audio chunk bhejo)
aiRouter.post('/transcribe', protect, async (req, res) => {
  try {
    // Note: Real implementation mein audio buffer milega
    // Yahan hum simulate kar rahe hain
    const { audioBase64, language } = req.body;

    // OpenAI Whisper se transcribe karo
    // Real code:
    // const transcription = await openai.audio.transcriptions.create({
    //   file: audioBuffer,
    //   model: 'whisper-1',
    //   language: language || 'hi'
    // });

    // Simulated response
    res.json({
      success: true,
      transcription: {
        text: 'Transcription text yahaan aayega',
        confidence: 0.95,
        language: language || 'hi',
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = { meetingRouter: router, aiRouter };
