import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { slides } from '../docs/slides-data.js';
import { layoutSlide } from '../docs/deck-layout.js';
const runtime = process.env.CODEX_ARTIFACT_RUNTIME,
  skill = process.env.PRESENTATION_SKILL_DIR;
if (!runtime || !skill)
  throw new Error(
    'Configura CODEX_ARTIFACT_RUNTIME y PRESENTATION_SKILL_DIR para regenerar el PowerPoint.',
  );
process.env.RUNTIME_NODE_MODULES ||= path.join(runtime, 'node/node_modules');
const { Presentation, PresentationFile } = await import(
  pathToFileURL(path.join(runtime, 'node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs'))
    .href
);
const { finalizePresentation, applyPresentationChartFont } = await import(
  pathToFileURL(path.join(skill, 'container_tools/artifact_tool_utils.mjs')).href
);
const workspaceDir = process.cwd(),
  build = path.join(workspaceDir, '.qa/deck-v2');
await fs.mkdir(build, { recursive: true });
const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });
deck.theme.defaultFont = 'Segoe UI';
for (const [index, data] of slides.entries()) {
  const slide = deck.slides.add(),
    layout = layoutSlide(data, index, slides.length);
  slide.background.fill = layout.background;
  for (const item of layout.items) {
    const position = { left: item.x, top: item.y, width: item.w, height: item.h };
    if (item.type === 'text') {
      const box = slide.shapes.add({
        geometry: 'textbox',
        position,
        fill: 'none',
        line: { fill: 'none', width: 0 },
      });
      box.text = item.value;
      box.text.style = {
        typeface: 'Segoe UI',
        fontSize: item.size,
        color: item.color,
        bold: item.bold,
        insets: 0,
        verticalAlignment: 'top',
      };
    } else if (item.type === 'image') {
      const bytes = await fs.readFile(item.src);
      slide.images.add({
        blob: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        contentType: 'image/png',
        alt: data.title,
        fit: 'contain',
        position,
      });
    } else {
      const c = item.data;
      const chart = slide.charts.add('line', {
        position,
        title: c.title,
        titleTextStyle: { fontSize: 19, fill: '#00365f', typeface: 'Segoe UI' },
        categories: c.categories,
        series: [
          {
            name: c.yTitle,
            values: c.values,
            line: { style: 'solid', fill: '#006b85', width: 3 },
            marker: { symbol: 'circle', size: 4, fill: '#ba8400' },
          },
        ],
        hasLegend: false,
        lineOptions: { smooth: false },
        xAxis: {
          title: {
            text: c.xTitle,
            textStyle: { fontSize: 17, typeface: 'Segoe UI', fill: '#48657c' },
          },
          textStyle: { fontSize: 15, typeface: 'Segoe UI', fill: '#48657c' },
          line: { fill: '#afc4d3', width: 1 },
        },
        yAxis: {
          title: {
            text: c.yTitle,
            textStyle: { fontSize: 17, typeface: 'Segoe UI', fill: '#48657c' },
          },
          min: 0,
          max: c.max,
          textStyle: { fontSize: 15, typeface: 'Segoe UI', fill: '#48657c' },
          majorGridlines: { style: 'solid', fill: '#dce6ed', width: 1 },
          numberFormatCode: '0.##',
        },
        chartFill: '#ffffff',
        plotAreaFill: '#ffffff',
      });
      applyPresentationChartFont(chart, { fontFamily: 'Segoe UI' });
    }
  }
  slide.speakerNotes.text = data.notes;
  const png = await deck.export({ slide, format: 'png', scale: 1 });
  await fs.writeFile(
    path.join(build, `slide-${String(index + 1).padStart(2, '0')}.png`),
    new Uint8Array(await png.arrayBuffer()),
  );
}
const candidatePath = path.join(build, `candidate-${Date.now()}.pptx`);
await (await PresentationFile.exportPptx(deck)).save(candidatePath);
const result = await finalizePresentation({
  workspaceDir,
  candidatePath,
  finalPath: path.join(workspaceDir, 'docs/presentacion-fisica-ii-upeu.pptx'),
  pythonExecutable: path.join(runtime, 'python/python.exe'),
  integrityValidatorPath: path.join(
    skill,
    'container_tools/inspect_presentation_package_integrity.py',
  ),
  layoutValidatorPath: path.join(skill, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-heading-fit'],
  explicitTotalSlideCount: 14,
  fontPolicy: { basis: 'design', families: ['Segoe UI'] },
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [6, 8],
  materializeLiteralChartWorkbooks: true,
  verifyArtifactToolImport: true,
  receiptPath: path.join(build, 'validation.json'),
});
console.log(
  JSON.stringify({ finalPath: result.finalPath, sha256: result.finalSha256, slides: 14 }),
);
