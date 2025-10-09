// api/chat.js - Función serverless para Vercel
// Este archivo maneja las peticiones al chatbot de forma segura

export default async function handler(req, res) {
  // Solo permitir POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método no permitido' 
    });
  }

  try {
    const { messages } = req.body;

    // Validar que vengan mensajes
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Formato de mensajes inválido' 
      });
    }

    // Obtener API key desde variables de entorno
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY no está configurada');
      return res.status(500).json({ 
        success: false, 
        error: 'API key no configurada. Por favor configura OPENAI_API_KEY en Vercel.' 
      });
    }

    // Llamar a OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 800,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error de OpenAI:', errorData);
      
      // Mensajes de error más amigables
      if (response.status === 401) {
        return res.status(500).json({ 
          success: false, 
          error: 'API key inválida. Verifica tu configuración en Vercel.' 
        });
      }
      
      if (response.status === 429) {
        return res.status(429).json({ 
          success: false, 
          error: 'Límite de uso excedido. Intenta de nuevo en unos momentos.' 
        });
      }

      return res.status(500).json({ 
        success: false, 
        error: `Error de OpenAI: ${errorData.error?.message || 'Error desconocido'}` 
      });
    }

    const data = await response.json();
    
    // Extraer respuesta
    const botMessage = data.choices[0]?.message?.content || 'No pude generar una respuesta.';

    // Responder al cliente
    return res.status(200).json({
      success: true,
      message: botMessage,
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0
      }
    });

  } catch (error) {
    console.error('❌ Error en chat API:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor: ' + error.message 
    });
  }
}