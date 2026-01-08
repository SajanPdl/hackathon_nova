// Initialize Supabase client
// Ensure supabase-config.js is loaded before this file and the Supabase SDK is loaded

// Use a self-executing function to avoid global scope pollution issues during init, 
// then assign the client to window.supabase
(function() {
    // Check if configuration exists
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
        console.error('Supabase configuration missing in supabase-config.js');
        return;
    }

    // Check if Supabase SDK is loaded
    // The CDN usually exposes the library as 'supabase' or 'supabase.createClient' depending on version
    // For @supabase/supabase-js@2 CDN, it exposes the 'supabase' object with 'createClient' method
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
        console.error('Supabase SDK not loaded. Please include the Supabase JS library.');
        return;
    }

    // Initialize the client
    // We override the global 'supabase' object (which was the library) with the initialized client
    // This allows us to use 'supabase.auth', 'supabase.from', etc. globally
    const { createClient } = window.supabase;
    window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log('Supabase client initialized successfully');
})();

