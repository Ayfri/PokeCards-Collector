import { processCardImage } from '$helpers/card-images';
import type { BinderCards } from '$lib/types';

export interface BinderExportOptions {
	columns: number;
	/** Pages to draw, in order. Each entry holds `rows * columns` slots. */
	pages: Array<Array<BinderCards | null>>;
	rows: number;
	/** Stamped in the corner box, falls back to the site name. */
	username?: string;
}

/** Rendered size of one card, tuned so a 3x3 page lands around 1000px wide - big enough to read the art. */
const CARD_WIDTH = 300;
const CARD_HEIGHT = 420;
const GAP = 12;
const PAGE_PADDING = 24;
const HEADER_HEIGHT = 56;
const BACKGROUND = '#0f1420';
const SHEET = '#1b2130';

/**
 * A binder slot stores the extensionless TCGdex base, while URL imports store a ready image URL. Only the
 * latter needs the proxy: `assets.tcgdex.net` answers with `Access-Control-Allow-Origin: *`.
 */
function resolveExportUrl(url: string): string {
	const lastSegment = url.split('/').pop() ?? '';
	if (!lastSegment.includes('.')) return processCardImage(url);
	return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function loadImage(src: string, crossOrigin = true): Promise<HTMLImageElement | null> {
	return new Promise(resolve => {
		const img = new Image();
		if (crossOrigin) img.crossOrigin = 'Anonymous';
		img.onload = () => resolve(img);
		img.onerror = () => resolve(null);
		img.src = src;
	});
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
	ctx.beginPath();
	ctx.roundRect(x, y, width, height, radius);
}

/** Draws every page one under the other and hands back a PNG data URL. */
export async function renderBinderImage({ columns, pages, rows, username }: BinderExportOptions): Promise<string> {
	const slotsPerPage = rows * columns;
	const pageWidth = columns * CARD_WIDTH + (columns - 1) * GAP + PAGE_PADDING * 2;
	const pageHeight = rows * CARD_HEIGHT + (rows - 1) * GAP + PAGE_PADDING * 2 + HEADER_HEIGHT;
	const canvas = document.createElement('canvas');
	canvas.width = pageWidth;
	canvas.height = pageHeight * pages.length;

	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas context unavailable.');

	ctx.fillStyle = BACKGROUND;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Every image is fetched at once, then drawn in order so a slow card never reorders the grid.
	const images = await Promise.all(
		pages.flatMap(page => page.map(slot => (slot?.url ? loadImage(resolveExportUrl(slot.url)) : Promise.resolve(null))))
	);

	pages.forEach((page, pageIndex) => {
		const originY = pageIndex * pageHeight;

		ctx.fillStyle = SHEET;
		roundedRect(ctx, 8, originY + 8, pageWidth - 16, pageHeight - 16, 18);
		ctx.fill();

		ctx.fillStyle = '#ffb700';
		ctx.font = 'bold 26px "Clash Display", sans-serif';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		ctx.fillText(`Page ${pageIndex + 1}`, PAGE_PADDING, originY + HEADER_HEIGHT / 2 + 8);

		ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
		ctx.font = '20px sans-serif';
		ctx.textAlign = 'right';
		ctx.fillText(`${page.filter(Boolean).length}/${slotsPerPage}`, pageWidth - PAGE_PADDING, originY + HEADER_HEIGHT / 2 + 8);

		for (let position = 0; position < slotsPerPage; position++) {
			const column = position % columns;
			const row = Math.floor(position / columns);
			const x = PAGE_PADDING + column * (CARD_WIDTH + GAP);
			const y = originY + HEADER_HEIGHT + PAGE_PADDING + row * (CARD_HEIGHT + GAP);
			const image = images[pageIndex * slotsPerPage + position];

			if (image) {
				ctx.drawImage(image, x, y, CARD_WIDTH, CARD_HEIGHT);
				continue;
			}

			ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
			roundedRect(ctx, x, y, CARD_WIDTH, CARD_HEIGHT, 12);
			ctx.fill();
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
			ctx.setLineDash([8, 8]);
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.setLineDash([]);

			ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
			ctx.font = '28px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(`${pageIndex * slotsPerPage + position + 1}`, x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2);
		}
	});

	const logo = await loadImage('/favicon.png');
	const label = username ? `${username}'s binder` : 'PokeCards-Collector';
	ctx.font = 'bold 24px "Clash Display", sans-serif';
	ctx.textAlign = 'left';
	ctx.textBaseline = 'middle';

	const logoHeight = logo ? 34 : 0;
	const logoWidth = logo ? (logo.width / logo.height) * logoHeight : 0;
	const gap = logo ? 12 : 0;
	const padding = 12;
	const boxWidth = logoWidth + gap + ctx.measureText(label).width + padding * 2;
	const boxHeight = Math.max(logoHeight, 24) + padding * 2;
	const boxX = pageWidth - boxWidth - 20;
	const boxY = canvas.height - boxHeight - 20;

	ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
	roundedRect(ctx, boxX, boxY, boxWidth, boxHeight, 10);
	ctx.fill();
	if (logo) ctx.drawImage(logo, boxX + padding, boxY + (boxHeight - logoHeight) / 2, logoWidth, logoHeight);
	ctx.fillStyle = '#ffffff';
	ctx.fillText(label, boxX + padding + logoWidth + gap, boxY + boxHeight / 2);

	return canvas.toDataURL('image/png');
}

export function downloadDataUrl(dataUrl: string, filename: string) {
	const link = document.createElement('a');
	link.href = dataUrl;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}
