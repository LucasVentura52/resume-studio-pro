let html2PdfFactoryPromise = null

const resolveHtml2PdfFactory = async () => {
  if (!html2PdfFactoryPromise) {
    html2PdfFactoryPromise = import('html2pdf.js')
      .then((module) => {
        const factory =
          typeof module.default === 'function'
            ? module.default
            : typeof module === 'function'
              ? module
              : typeof module?.html2pdf === 'function'
                ? module.html2pdf
                : null

        if (!factory) {
          throw new Error('Biblioteca de geracao de PDF nao esta disponivel.')
        }

        return factory
      })
      .catch((error) => {
        html2PdfFactoryPromise = null
        throw error
      })
  }

  return html2PdfFactoryPromise
}

const slugify = (value) =>
  (value || 'curriculo')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'curriculo'

const resolvePaperFormat = (paper) => (paper === 'letter' ? 'letter' : 'a4')

const isExternalImage = (src) => {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return false

  try {
    const parsed = new URL(src, window.location.href)
    return parsed.origin !== window.location.origin
  } catch {
    return false
  }
}

const createHiddenExportElement = (sourceElement) => {
  const wrapper = document.createElement('div')
  wrapper.setAttribute('aria-hidden', 'true')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-200vw'
  wrapper.style.top = '0'
  wrapper.style.width = '0'
  wrapper.style.height = '0'
  wrapper.style.opacity = '0'
  wrapper.style.pointerEvents = 'none'
  wrapper.style.overflow = 'hidden'

  const clone = sourceElement.cloneNode(true)
  clone.classList.add('pdf-export')

  clone.querySelectorAll('img').forEach((image) => {
    const src = image.getAttribute('src') || ''
    if (isExternalImage(src)) {
      image.style.visibility = 'hidden'
    }
  })

  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  return {
    element: clone,
    cleanup: () => {
      wrapper.remove()
    },
  }
}

const waitNextFrame = () =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })

export const exportResumePdf = async ({ element, title, paper = 'a4' }) => {
  if (!element) {
    throw new Error('Elemento de preview nao encontrado para gerar PDF.')
  }

  const filename = `${slugify(title)}.pdf`
  const html2PdfFactory = await resolveHtml2PdfFactory()

  const { element: exportElement, cleanup } = createHiddenExportElement(element)

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }

    await waitNextFrame()

    const options = {
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: exportElement.scrollWidth,
        windowHeight: exportElement.scrollHeight,
      },
      jsPDF: {
        unit: 'mm',
        format: resolvePaperFormat(paper),
        orientation: 'portrait',
      },
      pagebreak: { mode: ['avoid-all'] },
    }

    await html2PdfFactory().set(options).from(exportElement).save()
  } finally {
    cleanup()
  }
}
