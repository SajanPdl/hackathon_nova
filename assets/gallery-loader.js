(function(){
  // State
  let galleryItems = [];
  let currentIndex = 0;

  // DOM Elements (cached after load)
  let lightbox, lbContent, lbClose, lbPrev, lbNext, lbDownload, lbShare;

  async function fetchGallery(src){
    try{
      const res = await fetch(src);
      if(!res.ok) throw new Error('Failed to load ' + src);
      return await res.json();
    }catch(e){ console.error(e); return []; }
  }

  function extractYouTubeID(url){
    if(!url) return url;
    const reg = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    const m = url.match(reg);
    return m ? m[1] : url;
  }

  function makeItemNode(item, index){
    const div = document.createElement('div');
    div.className = 'bento-item ' + (item.span === '2x2' ? 'span-2x2' : 'span-1x1');

    if(item.type === 'image'){
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.alt || '';
      img.loading = 'lazy';
      img.style.cursor = 'zoom-in';
        // Open Lightbox on click
      img.addEventListener('click', () => openLightbox(index));
      div.appendChild(img);
    } else if(item.type === 'video'){
      const video = document.createElement('video');
      video.src = item.src;
      video.controls = false;
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.preload = 'metadata';
      if(item.poster) video.poster = item.poster;
      video.style.cursor = 'zoom-in';
      video.addEventListener('click', () => openLightbox(index));
      div.appendChild(video);
    } else if(item.type === 'youtube'){
      // For YouTube thumbnails in grid
      const id = extractYouTubeID(item.src);
      // Use a high-quality thumbnail as a placeholder
      const thumbUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
      
      const container = document.createElement('div');
      container.className = 'relative w-full h-full cursor-pointer group';
      container.addEventListener('click', () => openLightbox(index));

      const img = document.createElement('img');
      img.src = thumbUrl;
      img.alt = item.alt || 'YouTube video';
      img.className = 'w-full h-full object-cover';
      
      // Play icon overlay
      const icon = document.createElement('div');
      icon.className = 'absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition';
      icon.innerHTML = '<i class="fas fa-play-circle text-white text-5xl opacity-80 group-hover:scale-110 transition-transform"></i>';

      container.appendChild(img);
      container.appendChild(icon);
      div.appendChild(container);
    }
    return div;
  }

  // --- Lightbox Functions ---

  function openLightbox(index){
    if(index < 0 || index >= galleryItems.length) return;
    currentIndex = index;
    updateLightboxContent();
    
    lightbox.classList.remove('hidden');
    // small delay to allow display:block to apply before opacity transition
    setTimeout(() => {
        lightbox.classList.remove('opacity-0');
    }, 10);
    document.body.style.overflow = 'hidden'; // prevent background scrolling
  }

  function closeLightbox(){
    lightbox.classList.add('opacity-0');
    setTimeout(() => {
        lightbox.classList.add('hidden');
        lbContent.innerHTML = ''; // Create clean slate (stops video playback)
    }, 300);
    document.body.style.overflow = '';
  }

  function showNext(){
    if(galleryItems.length === 0) return;
    currentIndex = (currentIndex + 1) % galleryItems.length;
    updateLightboxContent();
  }

  function showPrev(){
    if(galleryItems.length === 0) return;
    currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
    updateLightboxContent();
  }

  function updateLightboxContent(){
    lbContent.innerHTML = ''; // clear previous
    const item = galleryItems[currentIndex];

    // Fade in effect for content
    const wrapper = document.createElement('div');
    wrapper.className = 'w-full h-full flex items-center justify-center animate-fade-in'; 
    // Note: animate-fade-in needs to be defined in CSS or utility, assuming simple opacity transition works

    if(item.type === 'image'){
        const img = document.createElement('img');
        img.src = item.src;
        img.alt = item.alt || '';
        img.className = 'max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg';
        wrapper.appendChild(img);
    } else if(item.type === 'video'){
        const video = document.createElement('video');
        video.src = item.src;
        video.controls = true;
        video.autoplay = true;
        video.className = 'max-w-full max-h-[85vh] shadow-2xl rounded-lg bg-black';
        wrapper.appendChild(video);
    } else if(item.type === 'youtube'){
        const id = extractYouTubeID(item.src);
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.className = 'w-full max-w-4xl aspect-video shadow-2xl rounded-lg border border-gray-800';
        wrapper.appendChild(iframe);
    }
    lbContent.appendChild(wrapper);
  }

  async function downloadCurrentItem(){
    const item = galleryItems[currentIndex];
    if(item.type === 'youtube'){
        alert('YouTube videos cannot be downloaded directly.');
        return;
    }

    const btn = document.getElementById('lb-download');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        // Try to fetch as blob for direct download
        const response = await fetch(item.src);
        if(!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        // Extract filename or default
        const parts = item.src.split('/');
        let filename = parts[parts.length-1].split('?')[0] || 'gallery-item';
        if(item.type === 'image' && !filename.includes('.')) filename += '.jpg';
        if(item.type === 'video' && !filename.includes('.')) filename += '.mp4';
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Download failed, falling back to new tab:', err);
        // Fallback: Open in new tab
        window.open(item.src, '_blank');
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
  }

  async function shareCurrentItem(){
    const item = galleryItems[currentIndex];
    
    // Construct correct URL
    let shareUrl = item.src;
    if(!shareUrl.startsWith('http')){
        shareUrl = window.location.origin + (shareUrl.startsWith('/') ? '' : '/') + shareUrl;
    }

    const shareData = {
        title: 'Hackathon Nova Gallery',
        text: item.alt || 'Check out this moment from Hackathon Nova!',
        url: shareUrl
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.log('Share canceled or failed', err);
        }
    } else {
        // Fallback: Copy URL
        try {
            await navigator.clipboard.writeText(shareData.url);
            
            // Visual feedback for copy
            const btn = document.getElementById('lb-share');
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> <span class="hidden sm:inline">Copied!</span>';
            setTimeout(() => {
                btn.innerHTML = originalContent;
            }, 2000);
        } catch (err) {
            alert('Could not copy link: ' + shareData.url);
        }
    }
  }

  // --- Initialization ---

  async function render(){
    const defaultSrc = '/assets/gallery.json';
    // We assume the first bento grid defines the main source for the lightbox
    // Ideally we merge all sources or handle multiple grids. 
    // For this specific setup, we'll just fetch once.
    
    const grids = document.querySelectorAll('.bento');
    if(grids.length === 0) return;

    // Fetch data from the first grid's source
    const src = grids[0].dataset.source || defaultSrc;
    galleryItems = await fetchGallery(src);
    
    if(!Array.isArray(galleryItems)) return;

    grids.forEach(container => {
        // We reuse galleryItems but respect the limit per container
        const limit = parseInt(container.dataset.limit) || galleryItems.length;
        const itemsToRender = galleryItems.slice(0, limit);
        
        container.innerHTML = '';
        itemsToRender.forEach((item, idx) => {
            const node = makeItemNode(item, idx);
            container.appendChild(node);
        });
    });

    initLightboxUI();
  }

  function initLightboxUI(){
    lightbox = document.getElementById('lightbox');
    lbContent = document.getElementById('lb-content');
    lbClose = document.getElementById('lb-close');
    lbPrev = document.getElementById('lb-prev');
    lbNext = document.getElementById('lb-next');
    lbDownload = document.getElementById('lb-download');
    lbShare = document.getElementById('lb-share');

    if(!lightbox) return;

    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });
    lbNext.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });
    lbDownload.addEventListener('click', (e) => { e.stopPropagation(); downloadCurrentItem(); });
    lbShare.addEventListener('click', (e) => { e.stopPropagation(); shareCurrentItem(); });

    // Close on background click
    lightbox.addEventListener('click', (e) => {
        if(e.target === lightbox || e.target === lbContent) {
            closeLightbox();
        }
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if(lightbox.classList.contains('hidden')) return;
        if(e.key === 'Escape') closeLightbox();
        if(e.key === 'ArrowLeft') showPrev();
        if(e.key === 'ArrowRight') showNext();
    });
  }

  document.addEventListener('DOMContentLoaded', render);
})();