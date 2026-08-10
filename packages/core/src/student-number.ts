/**
 * 神戸大学の学籍番号の解釈（2026-08 ユーザー提供の規則）:
 * - 基本形は数字7桁 + 英字1桁（例: 2243327S）。先頭2桁が入学年度（西暦下2桁）。
 * - 4桁目が英字なら大学院生（例: 261C020C）。
 * - 5桁目も英字なら交換留学生（例: 269LB01L）。交換留学生の先頭2桁は「来日年度」なので
 *   学年との照合には使えない。
 * - 末尾の英字と4桁目は所属学部を表す（学部生は一対一対応）。
 *
 * ここでの推測は運営の確認支援用のヒントであり、留年・休学・編入で外れるため
 * 自動修正には使わないこと。
 */

export type StudentNumberKind =
  | "undergraduate"
  | "graduate"
  | "exchange"
  | "unknown";

export interface StudentNumberInfo {
  kind: StudentNumberKind;
  /** 入学年度（西暦）。交換留学生は来日年度。読めない場合は null */
  admissionYear: number | null;
}

const isUpperAlpha = (ch: string) => /^[A-Z]$/.test(ch);

export function parseStudentNumber(
  studentNumber: string | undefined | null
): StudentNumberInfo {
  const value = (studentNumber ?? "").trim().toUpperCase();
  if (!/^[0-9]{2}/.test(value) || value.length < 8) {
    return { kind: "unknown", admissionYear: null };
  }
  const admissionYear = 2000 + parseInt(value.slice(0, 2), 10);
  const c4 = value[3];
  const c5 = value[4];
  if (isUpperAlpha(c4) && isUpperAlpha(c5)) {
    return { kind: "exchange", admissionYear };
  }
  if (isUpperAlpha(c4)) {
    return { kind: "graduate", admissionYear };
  }
  if (/^[0-9]{7}[A-Z]$/.test(value)) {
    return { kind: "undergraduate", admissionYear };
  }
  return { kind: "unknown", admissionYear: null };
}

/** 4月始まりの年度（例: 2026年3月 → 2025、2026年4月 → 2026） */
export function currentAcademicYear(now: Date = new Date()): number {
  return now.getFullYear() - (now.getMonth() < 3 ? 1 : 0);
}

/** 学籍番号から数えた在籍年数（1年目 = 1）。読めない・交換留学生は null */
export function enrolledYearsFromStudentNumber(
  studentNumber: string | undefined | null,
  now: Date = new Date()
): { years: number; admissionYear: number; kind: StudentNumberKind } | null {
  const info = parseStudentNumber(studentNumber);
  if (info.kind === "unknown" || info.kind === "exchange" || info.admissionYear == null) {
    return null;
  }
  const years = currentAcademicYear(now) - info.admissionYear + 1;
  if (years < 1) return null;
  return { years, admissionYear: info.admissionYear, kind: info.kind };
}

/**
 * 入力された学年（users.grade: '1'〜'4' / 'M1' 'M2' / 'D1'〜'D3' / 'other'）と
 * 学籍番号からの推測が食い違うか。true = 運営が確認したほうがよい。
 * 標準年限を超えた在籍（留年等）は判定できないためフラグしない。
 */
export function isGradeSuspicious(
  user: { grade?: string | null; studentNumber?: string | null; category?: string },
  now: Date = new Date()
): boolean {
  if (user.category === "exchange") return false;
  const grade = (user.grade ?? "").trim();
  if (!grade || grade === "other") return false;
  const enrolled = enrolledYearsFromStudentNumber(user.studentNumber, now);
  if (!enrolled) return false;

  if (enrolled.kind === "undergraduate") {
    // 学部の番号なのに院の学年が入っている（またはその逆）のもズレとして扱う
    if (!/^[1-4]$/.test(grade)) return true;
    if (enrolled.years > 4) return false;
    return parseInt(grade, 10) !== enrolled.years;
  }

  // 大学院: 番号からは修士/博士を区別できないため、学年の数字だけ照合する
  const m = /^([MD])([1-3])$/.exec(grade);
  if (!m) return true;
  const level = parseInt(m[2], 10);
  const maxYears = m[1] === "M" ? 2 : 3;
  if (enrolled.years > maxYears) return false;
  return level !== enrolled.years;
}
