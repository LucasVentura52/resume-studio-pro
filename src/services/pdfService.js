let html2PdfFactoryPromise = null
const FIT_LEVEL_CLASS_REGEX = /\bfit-level-\d+\b/g
const MAX_EXPORT_FIT_LEVEL = 3
const OVERFLOW_TOLERANCE_PX = 4

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
          throw new Error('Biblioteca de geração de PDF não está disponível.')
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
const mmToPx = (millimeters) => (millimeters * 96) / 25.4
const getPaperWidthMm = (paper) => (paper === 'letter' ? 216 : 210)
const getPaperHeightMm = (paper) => (paper === 'letter' ? 279 : 297)
const getPaperWidthPx = (paper) => Math.round(mmToPx(getPaperWidthMm(paper)))
const getPaperHeightPx = (paper) => Math.round(mmToPx(getPaperHeightMm(paper)))

const isExternalImage = (src) => {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return false

  try {
    const parsed = new URL(src, window.location.href)
    return parsed.origin !== window.location.origin
  } catch {
    return false
  }
}

const createHiddenExportElement = ({ sourceElement, paperWidthPx, paperHeightPx }) => {
  const wrapper = document.createElement('div')
  wrapper.setAttribute('aria-hidden', 'true')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-10000px'
  wrapper.style.top = '0'
  wrapper.style.width = `${paperWidthPx}px`
  wrapper.style.height = `${paperHeightPx}px`
  wrapper.style.opacity = '0'
  wrapper.style.pointerEvents = 'none'
  wrapper.style.overflow = 'visible'

  const clone = sourceElement.cloneNode(true)
  clone.classList.add('pdf-export')
  clone.style.width = `${paperWidthPx}px`
  clone.style.minWidth = `${paperWidthPx}px`
  clone.style.maxWidth = `${paperWidthPx}px`
  clone.style.height = `${paperHeightPx}px`
  clone.style.minHeight = `${paperHeightPx}px`
  clone.style.maxHeight = `${paperHeightPx}px`

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

const clearFitLevelClass = (element) => {
  if (!element) return
  element.className = element.className
    .replace(FIT_LEVEL_CLASS_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const setFitLevelClass = (element, level) => {
  clearFitLevelClass(element)
  if (level > 0) {
    element.classList.add(`fit-level-${level}`)
  }
}

const measureOverflow = (element, paper) => {
  if (!element) return 0
  const paperHeightPx = getPaperHeightPx(paper)
  return Math.max(0, element.scrollHeight - paperHeightPx)
}

const resolveStableFitLevel = async ({ element, paper, enabled }) => {
  if (!element || !enabled) return

  setFitLevelClass(element, 0)
  await waitNextFrame()

  let level = 0
  let overflow = measureOverflow(element, paper)

  while (overflow > OVERFLOW_TOLERANCE_PX && level < MAX_EXPORT_FIT_LEVEL) {
    level += 1
    setFitLevelClass(element, level)
    await waitNextFrame()
    overflow = measureOverflow(element, paper)
  }
}

export const exportResumePdf = async ({ element, title, paper = 'a4', fitToSinglePage = true }) => {
  if (!element) {
    throw new Error('Elemento de preview não encontrado para gerar PDF.')
  }

  const filename = `${slugify(title)}.pdf`
  const html2PdfFactory = await resolveHtml2PdfFactory()
  const paperWidthMm = getPaperWidthMm(paper)
  const paperHeightMm = getPaperHeightMm(paper)
  const paperWidthPx = getPaperWidthPx(paper)
  const paperHeightPx = getPaperHeightPx(paper)

  const { element: exportElement, cleanup } = createHiddenExportElement({
    sourceElement: element,
    paperWidthPx,
    paperHeightPx,
  })

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }

    await resolveStableFitLevel({
      element: exportElement,
      paper,
      enabled: fitToSinglePage,
    })

    await waitNextFrame()

    // Usa viewport virtual fixa para evitar variação entre desktop/mobile
    // em media queries e quebra de layout durante a rasterização.
    const renderViewportWidth = Math.max(1200, Math.round(mmToPx(paperWidthMm) * 1.5))
    const renderViewportHeight = Math.max(1700, Math.round(mmToPx(paperHeightMm) * 1.5))

    const options = {
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: renderViewportWidth,
        windowHeight: renderViewportHeight,
        width: paperWidthPx,
        height: paperHeightPx,
        scrollX: 0,
        scrollY: 0,
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
