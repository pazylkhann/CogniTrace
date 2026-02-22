import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid input types and subjects
const VALID_INPUT_TYPES = ['text', 'image'];
const VALID_SUBJECTS = ['mathematics', 'physics', 'chemistry', 'biology', 'english', 'history', 'science', 'humanities'];
const MAX_CONTENT_LENGTH = 50000; // 50KB max for text content

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // ===== AUTHENTICATION CHECK =====
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error("Missing or invalid Authorization header");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("JWT verification failed:", claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);

    // ===== INPUT VALIDATION =====
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!body.subject || typeof body.subject !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid or missing subject' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!body.inputType || typeof body.inputType !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid or missing inputType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate input type is from allowed list
    if (!VALID_INPUT_TYPES.includes(body.inputType)) {
      return new Response(JSON.stringify({ error: 'Invalid input type. Must be "text" or "image"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate subject is from allowed list (case-insensitive)
    const normalizedSubject = body.subject.toLowerCase().trim();
    if (!VALID_SUBJECTS.includes(normalizedSubject)) {
      return new Response(JSON.stringify({ error: 'Invalid subject' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { inputType, content, imageUrl, subject } = body;

    // Validate based on input type
    if (inputType === 'text') {
      if (!content || typeof content !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid or missing content for text input' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (content.length > MAX_CONTENT_LENGTH) {
        return new Response(JSON.stringify({ error: `Content too long (max ${MAX_CONTENT_LENGTH} characters)` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (content.trim().length === 0) {
        return new Response(JSON.stringify({ error: 'Content cannot be empty' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (inputType === 'image') {
      if (!imageUrl || typeof imageUrl !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid or missing imageUrl for image input' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Basic URL validation
      try {
        new URL(imageUrl);
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid imageUrl format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // ===== API KEY CHECK =====
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== AI ANALYSIS =====
    const generateCognitiveInsight = body.generateCognitiveInsight === true;
    
    const basePrompt = `You are CogniTrace, an expert cognitive analyst for teachers. Analyze student work to identify the THINKING PROCESS, not just correctness.

Your task:
1. Trace the student's cognitive pathway step-by-step
2. Identify WHERE logic breaks (not just that it's wrong)
3. Generate Socratic questions that guide discovery
4. Identify the specific topic the student struggled with

IMPORTANT: Even if the final answer is CORRECT, check if the METHOD is sound. A right answer with flawed reasoning is a "partial" verdict.`;

    const cognitiveInsightInstruction = generateCognitiveInsight ? `
5. Generate a "cognitiveInsight" object that includes:
   - focusLevel: Rate the student's focus/attention level (e.g., "High - methodical approach", "Medium - some scattered work", "Low - rushed or distracted")
   - struggleTopic: The specific topic or concept where the student had difficulty
   - insightSummary: A 2-3 sentence summary of the student's cognitive state and what they need to work on` : '';

    const jsonStructure = generateCognitiveInsight ? `{
  "verdict": "correct" | "partial" | "critical_error",
  "summary": "Brief explanation of the cognitive analysis",
  "errorType": "Type of error if any (e.g., 'Logical Fallacy', 'Calculation Error', 'Conceptual Misunderstanding')",
  "topic": "The specific topic being worked on",
  "cognitiveTrace": [
    { "step": 1, "description": "What the student did/thought", "isError": false },
    { "step": 2, "description": "Next step in their reasoning", "isError": true }
  ],
  "socraticQuestions": [
    "Question 1 to guide the student",
    "Question 2",
    "Question 3"
  ],
  "cognitiveInsight": {
    "focusLevel": "High/Medium/Low with brief description",
    "struggleTopic": "Specific topic they struggled with",
    "insightSummary": "2-3 sentence summary of cognitive state and needs"
  }
}` : `{
  "verdict": "correct" | "partial" | "critical_error",
  "summary": "Brief explanation of the cognitive analysis",
  "errorType": "Type of error if any (e.g., 'Logical Fallacy', 'Calculation Error', 'Conceptual Misunderstanding')",
  "topic": "The specific topic being worked on",
  "cognitiveTrace": [
    { "step": 1, "description": "What the student did/thought", "isError": false },
    { "step": 2, "description": "Next step in their reasoning", "isError": true }
  ],
  "socraticQuestions": [
    "Question 1 to guide the student",
    "Question 2",
    "Question 3"
  ]
}`;

    const systemPrompt = `${basePrompt}${cognitiveInsightInstruction}

Return ONLY valid JSON:
${jsonStructure}`;

    console.log("Processing analysis for user:", userId, "inputType:", inputType, "subject:", subject);

    // Build messages based on input type
    let userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    
    if (inputType === 'image') {
      userContent = [
        { type: "text", text: `Subject: ${subject}\n\nAnalyze this student's work shown in the image:` },
        { type: "image_url", image_url: { url: imageUrl } }
      ];
    } else {
      userContent = `Subject: ${subject}\n\nStudent's Work:\n${content}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Analysis failed. Please try again later." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Invalid AI response format:", aiContent);
      return new Response(JSON.stringify({ error: "Analysis failed. Please try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const result = JSON.parse(jsonMatch[0]);
    console.log("Analysis complete for user:", userId, "verdict:", result.verdict);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
