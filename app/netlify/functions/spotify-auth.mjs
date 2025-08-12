export default async (req) => {
  // Try to load dotenv if available (for local development)
  // In production, this will fail gracefully and use Netlify's env vars
  try {
    const { config } = await import('dotenv');
    config();
  } catch (e) {
    // dotenv not available or failed, use native environment variables
    console.log('Using native environment variables');
  }
  console.log('🎵 Spotify auth function called');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    console.error('❌ Method not allowed:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Allow': 'GET' }
    });
  }

  try {
    console.log('🔍 Checking environment variables...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('All env vars count:', Object.keys(process.env).length);
    console.log('Available SPOTIFY env vars:', Object.keys(process.env).filter(k => k.includes('SPOTIFY')));
    console.log('Available APP env vars:', Object.keys(process.env).filter(k => k.includes('APP')));
    
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const appUrl = process.env.APP_URL;
    console.log('SPOTIFY_CLIENT_ID exists:', !!clientId);
    console.log('SPOTIFY_CLIENT_ID length:', clientId ? clientId.length : 0);
    console.log('APP_URL exists:', !!appUrl);
    console.log('APP_URL value:', appUrl);
    
    if (!clientId) {
      console.error('❌ SPOTIFY_CLIENT_ID environment variable is not set');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error', 
        details: 'Spotify client ID not configured' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!appUrl) {
      console.error('❌ APP_URL environment variable is not set');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error', 
        details: 'APP_URL not configured. Please set APP_URL environment variable.' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const redirectUri = `${appUrl}/api/spotify-callback`;
    console.log('Redirect URI:', redirectUri);
    
    const scopes = [
      'user-modify-playback-state',
      'user-read-playback-state',
      'user-read-currently-playing'
    ];
    
    console.log('🔐 Generating state parameter...');
    // Generate state parameter for security
    const state = crypto.randomUUID();
    console.log('State generated:', !!state);
    
    console.log('🔗 Building authorization URL...');
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes.join(' '))}&` +
      `state=${encodeURIComponent(state)}`;
    
    console.log('✅ Auth URL created, length:', authUrl.length);
    
    return new Response(JSON.stringify({ authUrl, state }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('💥 Error in spotify-auth function:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error type:', error.constructor.name);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      type: error.constructor.name
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};