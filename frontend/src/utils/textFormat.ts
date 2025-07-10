/**
 * Converts HTML to WhatsApp formatted text
 * @param html - The HTML string to convert
 * @returns Plain text with WhatsApp formatting
 */
export const convertHtmlToWhatsApp = (html: string): string => {
  if (!html) return '';
  
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Process formatting recursively
  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    
    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    let content = Array.from(element.childNodes).map(processNode).join('');
    
    // Preserve line breaks for block elements
    const isBlockElement = ['div', 'p', 'br', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
    if (isBlockElement && tagName !== 'br') {
      content = `\n${content}\n`;
    } else if (tagName === 'br') {
      content = '\n';
    }
    
    // Apply WhatsApp formatting
    switch (tagName) {
      case 'strong':
      case 'b':
        return `*${content}*`;
      case 'em':
      case 'i':
        return `_${content}_`;
      case 's':
      case 'del':
        return `~${content}~`;
      case 'code':
      case 'pre':
        return `\`${content}\``;
      default:
        return content;
    }
  };
  
  // Process all nodes and clean up multiple newlines
  let result = Array.from(tempDiv.childNodes)
    .map(processNode)
    .join('')
    .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with double newline
    .trim();
  
  return result;
};

/**
 * Converts WhatsApp formatted text back to HTML for the editor
 * @param text - The WhatsApp formatted text
 * @returns HTML string
 */
export const convertWhatsAppToHtml = (text: string): string => {
  if (!text) return '';
  
  // Convert newlines to <br> and <p> tags
  let html = text
    .replace(/\n\n+/g, '</p><p>') // Double newline becomes paragraph
    .replace(/\n/g, '<br>'); // Single newline becomes <br>
  
  // Apply formatting
  html = html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold**
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')       // *bold*
    .replace(/__(.*?)__/g, '<em>$1</em>')               // __italic__
    .replace(/_(.*?)_/g, '<em>$1</em>')                 // _italic_
    .replace(/~~(.*?)~~/g, '<s>$1</s>')                 // ~~strikethrough~~
    .replace(/`(.*?)`/g, '<code>$1</code>');            // `code`
  
  // Wrap in paragraph if needed
  if (!html.startsWith('<p>') && !html.startsWith('<br>')) {
    html = `<p>${html}</p>`;
  }
  
  return html;
};
