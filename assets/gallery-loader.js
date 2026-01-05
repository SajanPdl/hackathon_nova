(function(){
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

  function makeItemNode(item){
    const div = document.createElement('div');
    div.className = 'bento-item ' + (item.span === '2x2' ? 'span-2x2' : 'span-1x1');

    if(item.type === 'image'){
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.alt || '';
      img.loading = 'lazy';
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', ()=> window.open(item.src, '_blank'));
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
      div.appendChild(video);
    } else if(item.type === 'youtube'){
      const id = extractYouTubeID(item.src);
      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube.com/embed/' + id + '?rel=0';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.title = item.alt || 'YouTube video';
      div.appendChild(iframe);
    }
    return div;
  }

  async function render(){
    const defaultSrc = '/assets/gallery.json';
    const galleryData = await fetchGallery(defaultSrc);
    if(!Array.isArray(galleryData)) return;

    document.querySelectorAll('.bento').forEach(container => {
      const source = container.dataset.source || defaultSrc;
      // if different source requested, try fetch it (but prefer already fetched)
      // for now we use the pre-fetched galleryData
      const limit = parseInt(container.dataset.limit) || galleryData.length;
      const items = galleryData.slice(0, limit);
      container.innerHTML = '';
      items.forEach(item => {
        const node = makeItemNode(item);
        container.appendChild(node);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', render);
})();