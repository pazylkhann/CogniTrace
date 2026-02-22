import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Processing modes
type ProcessingMode = 'OCR_ONLY' | 'COGNITIVE_ANALYSIS' | 'SOCRATIC_CHAT';

const VALID_SUBJECTS = ['mathematics', 'physics', 'chemistry', 'biology', 'english', 'history', 'science', 'humanities', 'computer_science', 'economics'];

// System prompts for different modes
const SYSTEM_PROMPTS = {
  OCR_ONLY: `You are a pure OCR engine for Mathematical and Scientific Handwriting.

Your task:
1. Transcribe the image content into clean Markdown and LaTeX
2. Do NOT solve the problem
3. Do NOT analyze errors
4. Just output the raw text exactly as written in the image
5. If a symbol is ambiguous, mark it with [?]
6. Use proper LaTeX notation: $x^2$, $\\frac{a}{b}$, $\\sqrt{x}$, etc.
7. Preserve the structure (equations, steps, diagrams described in text)

Return ONLY the transcribed text, nothing else.`,

  COGNITIVE_ANALYSIS: `You are CogniTrace, an expert cognitive analyst for teachers. Analyze student work to identify the THINKING PROCESS, not just correctness.

Your task:
1. Trace the student's cognitive pathway step-by-step
2. Identify WHERE logic breaks (not just that it's wrong)
3. Generate Socratic questions that guide discovery
4. Identify the specific topic the student struggled with

IMPORTANT: Even if the final answer is CORRECT, check if the METHOD is sound. A right answer with flawed reasoning is a "partial" verdict.

Return ONLY valid JSON:
{
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
}`,

  SOCRATIC_CHAT: `You are a world-class Socratic Mentor and tutor. Your role is to guide students to understanding through questioning, not direct answers.

## HYBRID KNOWLEDGE STRATEGY (Critical)

You operate on a **Tiered Knowledge System**:

**Tier 1 (Priority - Teacher Materials):**
When classroom materials are provided below, they are your PRIMARY source of truth. If a relevant rule, formula, or concept exists in the teacher's uploaded materials:
- USE IT as the authoritative answer
- CITE the source (e.g., "According to your class notes...", "Based on the Lecture Notes...")
- This ensures students learn the specific approach their teacher is teaching

**Tier 2 (Fallback - General Knowledge):**
If NO specific material is found in the class resources, or the teacher hasn't uploaded anything relevant:
- Fall back to your general mathematical/scientific knowledge base
- Clearly indicate this: "I don't see a specific rule in your class materials, but based on standard [subject] principles..."
- Never say "I don't have information" - always provide guidance

**Tier 3 (Guidance):**
Regardless of source, always use Socratic questioning to guide the student to discover the answer themselves.

## Core Principles:
1. NEVER provide direct answers to problems
2. When a student is stuck, ask guiding questions to uncover their logic
3. Focus on teaching the "Why" behind concepts
4. Celebrate their reasoning when they make progress
5. If they show understanding, suggest similar practice problems
6. Reference teacher materials FIRST when relevant
7. Be encouraging but intellectually rigorous
8. Use appropriate mathematical notation with LaTeX when needed
9. When analyzing images, describe what you observe and ask questions about it without solving

Response style:
- Keep responses conversational but educational
- Ask one or two focused questions at a time
- Acknowledge correct reasoning before probing deeper
- If they're completely lost, break the problem into smaller parts
- When viewing student work images, identify key elements and guide understanding through observation`,
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to call Lovable AI Gateway with retry logic
async function callLovableAI(
  apiKey: string,
  systemPrompt: string,
  messages: any[],
  config: { temperature: number; maxOutputTokens: number }
): Promise<{ success: boolean; data?: string; error?: string; status?: number }> {
  const lovableAIUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
  
  // Convert Gemini format messages to OpenAI format
  const openAIMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map(msg => {
      if (msg.role === 'model') {
        return { role: 'assistant', content: msg.parts?.map((p: any) => p.text || '').join('') || '' };
      }
      // Handle multimodal content (images)
      if (msg.parts?.some((p: any) => p.inlineData)) {
        const content: any[] = [];
        for (const part of msg.parts) {
          if (part.text) {
            content.push({ type: 'text', text: part.text });
          } else if (part.inlineData) {
            content.push({
              type: 'image_url',
              image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
            });
          }
        }
        return { role: 'user', content };
      }
      return { role: 'user', content: msg.parts?.map((p: any) => p.text || '').join('') || '' };
    })
  ];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[Lovable AI] Attempt ${attempt}/${MAX_RETRIES}`);
    
    try {
      const response = await fetch(lovableAIUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: openAIMessages,
          temperature: config.temperature,
          max_tokens: config.maxOutputTokens,
        }),
      });

      const responseText = await response.text();
      
      if (response.status === 429) {
        console.warn(`[Lovable AI] Rate limit hit (429) on attempt ${attempt}/${MAX_RETRIES}`);
        
        if (attempt < MAX_RETRIES) {
          console.log(`[Lovable AI] Waiting ${RETRY_DELAY_MS}ms before retry...`);
          await delay(RETRY_DELAY_MS);
          continue;
        } else {
          return {
            success: false,
            error: "Rate limits exceeded, please try again later.",
            status: 429
          };
        }
      }

      if (response.status === 402) {
        return {
          success: false,
          error: "Payment required. Please add funds to your Lovable AI workspace.",
          status: 402
        };
      }

      if (!response.ok) {
        console.error(`[Lovable AI] Error response (${response.status}):`, responseText);
        
        let errorMessage = `AI gateway error (${response.status})`;
        try {
          const errorJson = JSON.parse(responseText);
          errorMessage = errorJson.error?.message || errorJson.error || errorMessage;
        } catch {
          console.error(`[Lovable AI] Raw error response:`, responseText);
        }
        
        return {
          success: false,
          error: errorMessage,
          status: response.status
        };
      }

      // Success - parse and return
      try {
        const data = JSON.parse(responseText);
        const content = data.choices?.[0]?.message?.content || "";
        console.log(`[Lovable AI] Success on attempt ${attempt}`);
        return { success: true, data: content };
      } catch (parseError) {
        console.error(`[Lovable AI] Failed to parse response:`, responseText);
        return {
          success: false,
          error: "Failed to parse AI response",
          status: response.status
        };
      }
      
    } catch (networkError) {
      console.error(`[Lovable AI] Network error on attempt ${attempt}:`, networkError);
      
      if (attempt < MAX_RETRIES) {
        console.log(`[Lovable AI] Waiting ${RETRY_DELAY_MS}ms before retry...`);
        await delay(RETRY_DELAY_MS);
        continue;
      } else {
        return {
          success: false,
          error: `Network error after ${MAX_RETRIES} attempts: ${networkError instanceof Error ? networkError.message : 'Unknown error'}`,
          status: 503
        };
      }
    }
  }
  
  return { success: false, error: "Unexpected error in retry loop", status: 500 };
}

// Streaming helper function for SSE
async function* streamLovableAI(
  apiKey: string,
  systemPrompt: string,
  messages: any[],
  config: { temperature: number; maxOutputTokens: number }
): AsyncGenerator<string, void, unknown> {
  const lovableAIUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
  
  // Convert Gemini format messages to OpenAI format
  const openAIMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map(msg => {
      if (msg.role === 'model') {
        return { role: 'assistant', content: msg.parts?.map((p: any) => p.text || '').join('') || '' };
      }
      if (msg.parts?.some((p: any) => p.inlineData)) {
        const content: any[] = [];
        for (const part of msg.parts) {
          if (part.text) {
            content.push({ type: 'text', text: part.text });
          } else if (part.inlineData) {
            content.push({
              type: 'image_url',
              image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
            });
          }
        }
        return { role: 'user', content };
      }
      return { role: 'user', content: msg.parts?.map((p: any) => p.text || '').join('') || '' };
    })
  ];

  console.log(`[Lovable AI Streaming] Starting stream request`);
  
  const response = await fetch(lovableAIUrl, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: openAIMessages,
      temperature: config.temperature,
      max_tokens: config.maxOutputTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Lovable AI Streaming] Error (${response.status}):`, errorText);
    throw new Error(`AI gateway error (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error("No response body for streaming");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (!trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6).trim();
        if (jsonStr === '[DONE]') return;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // Incomplete JSON, wait for more data
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // ===== AUTHENTICATION CHECK =====
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const { mode, subject, content, imageUrl, classroomId, conversationHistory, stream } = body;

    // Validate mode
    if (!mode || !['OCR_ONLY', 'COGNITIVE_ANALYSIS', 'SOCRATIC_CHAT'].includes(mode)) {
      return new Response(JSON.stringify({ error: 'Invalid mode. Must be OCR_ONLY, COGNITIVE_ANALYSIS, or SOCRATIC_CHAT' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate subject for analysis modes
    if (mode !== 'OCR_ONLY' && subject) {
      const normalizedSubject = subject.toLowerCase().trim();
      if (!VALID_SUBJECTS.includes(normalizedSubject)) {
        return new Response(JSON.stringify({ error: 'Invalid subject' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate content based on mode
    if (mode === 'OCR_ONLY' && !imageUrl) {
      return new Response(JSON.stringify({ error: 'imageUrl required for OCR_ONLY mode' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'COGNITIVE_ANALYSIS' && !content?.trim()) {
      return new Response(JSON.stringify({ error: 'content required for COGNITIVE_ANALYSIS mode' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'SOCRATIC_CHAT' && !content?.trim() && !conversationHistory?.length) {
      return new Response(JSON.stringify({ error: 'content or conversationHistory required for SOCRATIC_CHAT mode' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== API KEY CHECK - Use Lovable AI Gateway (auto-provisioned) =====
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    console.log(`[Config] LOVABLE_API_KEY present: ${!!LOVABLE_API_KEY}`);
    
    if (!LOVABLE_API_KEY) {
      console.error("[Config] LOVABLE_API_KEY is NOT configured!");
      return new Response(JSON.stringify({ 
        error: 'AI service not configured. Please ensure Lovable Cloud is properly set up.',
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== FETCH CLASS MATERIALS FOR CONTEXT (if classroomId provided) =====
    // This implements the Hybrid RAG approach - prioritize teacher materials
    let materialContext = '';
    if (classroomId && (mode === 'SOCRATIC_CHAT' || mode === 'COGNITIVE_ANALYSIS')) {
      console.log(`[Context] Fetching materials for classroom: ${classroomId}`);
      
      const { data: materials, error: materialsError } = await supabaseClient
        .from('class_materials')
        .select('title, description, file_type')
        .eq('classroom_id', classroomId)
        .limit(10);

      if (materialsError) {
        console.warn(`[Context] Failed to fetch materials: ${materialsError.message}`);
      } else if (materials?.length) {
        console.log(`[Context] Found ${materials.length} class materials`);
        materialContext = `\n\n## TEACHER'S CLASS MATERIALS (Tier 1 - Use as Primary Source)
The following materials have been uploaded by the teacher for this class. Prioritize these as your source of truth:
${materials.map(m => `- **${m.title}**${m.description ? `: ${m.description}` : ''} (${m.file_type})`).join('\n')}

When answering, cite these materials if relevant. If the student's question relates to content covered in these materials, guide them using the teacher's specific approach.`;
      } else {
        console.log(`[Context] No materials found for classroom, will use general knowledge`);
        materialContext = '\n\n## Note: No specific class materials available. Using general knowledge base (Tier 2).';
      }
    }

    // ===== BUILD AI REQUEST =====
    const systemPrompt = SYSTEM_PROMPTS[mode as ProcessingMode] + materialContext;
    
    let messages: any[] = [];

    // Build content based on mode
    if (mode === 'OCR_ONLY') {
      const imageData = imageUrl.startsWith('data:') ? imageUrl.split(',')[1] : await fetchImageAsBase64(imageUrl);
      messages.push({
        role: 'user',
        parts: [
          { text: `Please transcribe this ${subject || 'academic'} handwriting:` },
          { inlineData: { mimeType: 'image/jpeg', data: imageData } }
        ]
      });
    } else if (mode === 'COGNITIVE_ANALYSIS') {
      messages.push({
        role: 'user',
        parts: [{ text: `Subject: ${subject}\n\nStudent's Work:\n${content}` }]
      });
  } else if (mode === 'SOCRATIC_CHAT') {
      // Add conversation history with trimming (keep last 10 messages to save tokens)
      const MAX_HISTORY_MESSAGES = 10;
      const trimmedHistory = conversationHistory?.length > MAX_HISTORY_MESSAGES
        ? conversationHistory.slice(-MAX_HISTORY_MESSAGES)
        : conversationHistory || [];
      
      console.log(`[Context] Trimmed conversation history: ${conversationHistory?.length || 0} -> ${trimmedHistory.length} messages`);
      
      if (trimmedHistory.length) {
        for (const msg of trimmedHistory) {
          messages.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          });
        }
      }
      // Add current message with optional image
      if (content?.trim() || imageUrl) {
        const parts: any[] = [];
        
        if (content?.trim()) {
          parts.push({ text: content });
        }
        
        // Handle image in chat (for multimodal tutor)
        if (imageUrl) {
          try {
            const imageData = imageUrl.startsWith('data:') 
              ? imageUrl.split(',')[1] 
              : await fetchImageAsBase64(imageUrl);
            parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageData } });
            if (!content?.trim()) {
              parts.unshift({ text: "The student has shared an image of their work. Analyze it and guide them using Socratic questioning without giving direct answers." });
            }
          } catch (e) {
            console.error('[Image] Failed to process chat image:', e);
          }
        }
        
        if (parts.length > 0) {
          messages.push({ role: 'user', parts });
        }
      }
    }

    console.log(`[Request] Processing ${mode} for user: ${user.id}, stream: ${!!stream}`);

    // ===== STREAMING MODE FOR SOCRATIC_CHAT =====
    if (mode === 'SOCRATIC_CHAT' && stream) {
      console.log(`[Stream] Starting SSE stream for user: ${user.id}`);
      
      const encoder = new TextEncoder();
      const streamBody = new ReadableStream({
        async start(controller) {
          try {
            const generator = streamLovableAI(
              LOVABLE_API_KEY,
              systemPrompt,
              messages,
              { temperature: 0.7, maxOutputTokens: 1500 }
            );

            for await (const chunk of generator) {
              const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
            
            // Send done signal
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            console.log(`[Stream] Completed for user: ${user.id}`);
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[Stream] Error:`, errMsg);
            const errorData = `data: ${JSON.stringify({ error: errMsg })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            controller.close();
          }
        },
      });

      return new Response(streamBody, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // ===== NON-STREAMING: CALL LOVABLE AI GATEWAY =====
    const result = await callLovableAI(
      LOVABLE_API_KEY,
      systemPrompt,
      messages,
      {
        temperature: mode === 'SOCRATIC_CHAT' ? 0.7 : 0.3,
        maxOutputTokens: mode === 'COGNITIVE_ANALYSIS' ? 2000 : 1500,
      }
    );

    if (!result.success) {
      console.error(`[Lovable AI] Final failure:`, result.error);
      return new Response(JSON.stringify({ 
        error: result.error,
        status: result.status
      }), {
        status: result.status || 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiContent = result.data || "";
    
    // ===== PROCESS RESPONSE BASED ON MODE =====
    let responseData: any;
    
    if (mode === 'OCR_ONLY') {
      responseData = { extractedText: aiContent.trim() };
    } else if (mode === 'COGNITIVE_ANALYSIS') {
      // Parse JSON from response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[Parse] Invalid AI response format:", aiContent);
        return new Response(JSON.stringify({ error: "Analysis failed - invalid response format. Please try again." }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      responseData = JSON.parse(jsonMatch[0]);
    } else if (mode === 'SOCRATIC_CHAT') {
      responseData = { response: aiContent.trim() };
    }

    console.log(`[Success] ${mode} complete for user: ${user.id}`);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    
    console.error("[Fatal] Unexpected error:", errorMessage);
    console.error("[Fatal] Stack:", errorStack);
    
    return new Response(JSON.stringify({ 
      error: "An unexpected error occurred. Please try again.",
      debug: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper function to fetch image and convert to base64
async function fetchImageAsBase64(url: string): Promise<string> {
  console.log(`[Image] Fetching: ${url.substring(0, 50)}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  console.log(`[Image] Fetched ${bytes.length} bytes`);
  return btoa(binary);
}
