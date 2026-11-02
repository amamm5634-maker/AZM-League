import type { Match, Team, TournamentState } from '../types';
import { GROUP_LABELS, MATCH_STATUS_LABELS, ROUND_LABELS, TOURNAMENT } from '../data/config';
import { eventsForMatch, formatArabicDate, playerById, teamById } from './stats';
import { TEAM_EMOJI } from '../data/teamEmoji';

const W = 1080;
const H = 1350;
const DISPLAY = "'Lalezar', 'IBM Plex Sans Arabic', Tahoma, sans-serif";
const BODY = "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'center') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.direction = 'rtl';
  ctx.fillText(value, x, y);
}

async function drawBadge(ctx: CanvasRenderingContext2D, team: Team | undefined, cx: number, cy: number, r: number) {
  const logo = team?.logo ? await loadImage(`${import.meta.env.BASE_URL}${team.logo}`) : null;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
  ctx.fillStyle = '#e4ff9a';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fillStyle = '#050b11';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = logo ? '#ffffff' : team?.color ?? '#475569';
  ctx.fill();
  ctx.clip();
  if (logo) {
    const s = r * 1.5;
    ctx.drawImage(logo, cx - s / 2, cy - s / 2, s, s);
  } else {
    const emoji = team ? TEAM_EMOJI[team.nickname] : undefined;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = emoji ? `${Math.round(r * 1.05)}px ${BODY}` : `${Math.round(r * 0.8)}px ${DISPLAY}`;
    ctx.fillText(emoji ?? team?.short ?? '؟', cx, cy + 4);
  }
  ctx.restore();
}

/** يرسم بطاقة نتيجة المباراة (1080×1350) جاهزة للنشر على واتساب وإنستغرام */
export async function renderMatchImage(state: TournamentState, match: Match): Promise<Blob> {
  try {
    await Promise.all([document.fonts.load(`100px Lalezar`), document.fonts.load(`600 40px 'IBM Plex Sans Arabic'`)]);
  } catch {
    // الخطوط غير متاحة: نستخدم خط النظام
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');

  const home = teamById(state, match.homeId);
  const away = teamById(state, match.awayId);
  const hasScore = match.status !== 'scheduled';

  // الخلفية: ليل + إضاءة من لون كل فريق
  ctx.fillStyle = '#050b11';
  ctx.fillRect(0, 0, W, H);
  const glow = (x: number, color: string) => {
    const g = ctx.createRadialGradient(x, 380, 20, x, 380, 640);
    g.addColorStop(0, hexToRgba(color, 0.5));
    g.addColorStop(1, 'rgba(5,11,17,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(W - 120, home?.color ?? '#12a05a');
  glow(120, away?.color ?? '#12a05a');
  const floor = ctx.createLinearGradient(0, 900, 0, H);
  floor.addColorStop(0, 'rgba(14,106,62,0)');
  floor.addColorStop(1, 'rgba(14,106,62,0.55)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 900, W, H - 900);
  ctx.strokeStyle = 'rgba(184,242,58,0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 34, W - 68, H - 68);

  // العنوان
  const title = ctx.createLinearGradient(0, 100, 0, 200);
  title.addColorStop(0, '#e4ff9a');
  title.addColorStop(0.55, '#b8f23a');
  title.addColorStop(1, '#8fc41f');
  text(ctx, TOURNAMENT.name, W / 2, 190, `120px ${DISPLAY}`, title as unknown as string);
  text(ctx, `${TOURNAMENT.university} · ${GROUP_LABELS[match.group]} · ${ROUND_LABELS[match.round]}`, W / 2, 262, `600 34px ${BODY}`, '#9fb0bb');

  // الحالة
  const statusColor = match.status === 'live' ? '#ff4d63' : '#b8f23a';
  ctx.fillStyle = hexToRgba(statusColor, 0.16);
  ctx.beginPath();
  ctx.roundRect(W / 2 - 90, 296, 180, 56, 28);
  ctx.fill();
  text(ctx, MATCH_STATUS_LABELS[match.status], W / 2, 335, `700 32px ${BODY}`, statusColor);

  // الفريقان والنتيجة (المضيف يمين لأن الاتجاه عربي)
  await drawBadge(ctx, home, W - 190, 560, 100);
  await drawBadge(ctx, away, 190, 560, 100);
  text(ctx, home?.name ?? '', W - 190, 740, `48px ${DISPLAY}`, '#f4f8f6');
  text(ctx, away?.name ?? '', 190, 740, `48px ${DISPLAY}`, '#f4f8f6');
  if (hasScore) {
    text(ctx, String(match.homeScore), W / 2 + 100, 620, `170px ${DISPLAY}`, '#b8f23a');
    text(ctx, '–', W / 2, 600, `110px ${DISPLAY}`, '#6fa512');
    text(ctx, String(match.awayScore), W / 2 - 100, 620, `170px ${DISPLAY}`, '#b8f23a');
  } else {
    text(ctx, match.time, W / 2, 610, `150px ${DISPLAY}`, '#b8f23a');
  }

  // الأهداف
  let y = 880;
  const goals = eventsForMatch(state, match.id).slice(0, 7);
  if (goals.length > 0) {
    text(ctx, 'الأهداف', W / 2, y, `44px ${DISPLAY}`, '#e4ff9a');
    y += 62;
    for (const e of goals) {
      const scorer = playerById(state, e.scorerId);
      const team = teamById(state, e.teamId);
      const min = e.minute != null ? `${e.minute}'  ` : '';
      text(ctx, `${min}${scorer?.name ?? ''} (${team?.nickname ?? ''})`, W / 2, y, `600 38px ${BODY}`, '#e8edf1');
      y += 52;
    }
  }
  const motm = match.motmId ? playerById(state, match.motmId) : undefined;
  if (motm) {
    text(ctx, `★ أفضل لاعب: ${motm.name}`, W / 2, Math.max(y + 20, 1100), `700 38px ${BODY}`, '#f6e27a');
  }

  // التذييل
  text(ctx, `${formatArabicDate(match.date)} · ${match.time} · ${match.venue}`, W / 2, 1245, `600 32px ${BODY}`, '#9fb0bb');
  let url = `${window.location.host}${window.location.pathname}`.replace(/\/$/, '');
  ctx.font = `700 30px ${BODY}`;
  if (ctx.measureText(url).width > W - 120) url = window.location.host;
  text(ctx, url, W / 2, 1292, `700 30px ${BODY}`, '#b8f23a');

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), 'image/png');
  });
}
