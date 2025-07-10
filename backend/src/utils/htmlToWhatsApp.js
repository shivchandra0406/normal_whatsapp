const { JSDOM } = require('jsdom');

function convertHtmlToWhatsApp(html) {
  // Create a DOM environment to parse HTML
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const body = document.body;

  // Process the DOM tree and convert to WhatsApp format
  function processNode(node) {
    if (node.nodeType === 3) { // Text node
      return node.textContent;
    }

    let result = '';
    const children = Array.from(node.childNodes).map(child => processNode(child)).join('');

    switch (node.nodeName.toLowerCase()) {
      case 'p':
        return children + '\n\n';
      case 'br':
        return '\n';
      case 'b':
      case 'strong':
        return `*${children}*`;
      case 'i':
      case 'em':
        return `_${children}_`;
      case 'strike':
      case 'del':
        return `~${children}~`;
      case 'code':
      case 'pre':
        return `\`\`\`${children}\`\`\``;
      case 'h1':
        return `*${children}*\n\n`;
      case 'h2':
        return `*${children}*\n\n`;
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return `*${children}*\n\n`;
      case 'ul':
      case 'ol':
        return children + '\n';
      case 'li':
        // Check if parent is ordered list
        if (node.parentElement.nodeName.toLowerCase() === 'ol') {
          const index = Array.from(node.parentElement.children).indexOf(node) + 1;
          return `${index}. ${children}\n`;
        }
        return `• ${children}\n`;
      case 'div':
        return children + '\n';
      default:
        return children;
    }
  }

  let whatsappText = processNode(body).trim();

  // Clean up multiple newlines
  whatsappText = whatsappText.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // Clean up any remaining HTML entities
  whatsappText = whatsappText
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return whatsappText;
}

module.exports = {
  convertHtmlToWhatsApp
};
