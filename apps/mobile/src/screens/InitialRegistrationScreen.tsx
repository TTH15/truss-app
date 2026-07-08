import { FACULTIES, type Language } from '@truss/core';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SelectField } from '@/components/SelectField';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { pickStudentIdImage, type PickedStudentIdImage } from '@/lib/student-id-image';

type Category = 'japanese' | 'regular-international' | 'exchange';

const translations = {
  ja: {
    title: '初期登録',
    subtitle: '基本情報を入力してください（学生証は任意）',
    name: '氏名', namePlaceholder: '山田太郎',
    furigana: 'フリガナ', furiganaPlaceholder: 'ヤマダタロウ',
    studentNumber: '学籍番号', studentNumberPlaceholder: '1234567A',
    studentNumberError: '学籍番号に誤りがあります（英数字7〜8桁）',
    phone: '電話番号', phonePlaceholder: '09012345678',
    phoneError: '電話番号は必須です（数字のみ8〜15桁目安）',
    faculty: '学部', facultyPlaceholder: '学部を選択してください',
    department: '学科', departmentPlaceholder: '学科を選択してください',
    grade: '学年', gradePlaceholder: '学年を選択してください',
    category: '区分',
    japanese: '日本人学生・国内学生', regularInternational: '正規留学生', exchange: '交換留学生',
    studentIdLabel: '学生証写真（任意）',
    studentIdHint: 'アップロードできない場合はこのまま送信できます。承認後にいつでも提出できます。',
    choosePhoto: '写真を選択', changePhoto: '別の写真を選択',
    submit: '承認待ちに進む',
    submitting: '送信中...',
    required: '必須項目です',
    grade1: 'B1 (学部1年)', grade2: 'B2 (学部2年)', grade3: 'B3 (学部3年)', grade4: 'B4 (学部4年)',
    gradeM1: 'M1 (修士1年)', gradeM2: 'M2 (修士2年)', gradeD1: 'D1 (博士1年)', gradeD2: 'D2 (博士2年)', gradeD3: 'D3 (博士3年)',
    gradeOther: 'その他',
  },
  en: {
    title: 'Initial Registration',
    subtitle: 'Please enter your basic information (student ID photo is optional)',
    name: 'Full Name', namePlaceholder: 'Taro Yamada',
    furigana: 'Furigana', furiganaPlaceholder: 'ヤマダタロウ',
    studentNumber: 'Student ID Number', studentNumberPlaceholder: '1234567A',
    studentNumberError: 'Invalid student ID number (7-8 alphanumeric characters)',
    phone: 'Phone Number', phonePlaceholder: '09012345678',
    phoneError: 'Phone number is required (8-15 digits)',
    faculty: 'Faculty', facultyPlaceholder: 'Select Faculty',
    department: 'Department', departmentPlaceholder: 'Select Department',
    grade: 'Grade', gradePlaceholder: 'Select Grade',
    category: 'Category',
    japanese: 'Japanese Student', regularInternational: 'Regular International Student', exchange: 'Exchange Student',
    studentIdLabel: 'Student ID Photo (Optional)',
    studentIdHint: "If you can't upload now, you can submit without it and add it later after approval.",
    choosePhoto: 'Choose Photo', changePhoto: 'Choose Different Photo',
    submit: 'Submit for Approval',
    submitting: 'Submitting...',
    required: 'This field is required',
    grade1: 'B1 (1st Year)', grade2: 'B2 (2nd Year)', grade3: 'B3 (3rd Year)', grade4: 'B4 (4th Year)',
    gradeM1: 'M1 (Master 1st Year)', gradeM2: 'M2 (Master 2nd Year)', gradeD1: 'D1 (Doctoral 1st Year)', gradeD2: 'D2 (Doctoral 2nd Year)', gradeD3: 'D3 (Doctoral 3rd Year)',
    gradeOther: 'Other',
  },
};

function normalizeStudentNumber(value: string): string {
  return value
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[\s　]/g, '')
    .toUpperCase();
}

function validateStudentNumber(value: string): boolean {
  return !value || /^[A-Z0-9]{7,8}$/.test(value);
}

function validatePhoneNumber(value: string): boolean {
  const normalized = value.replace(/[\s-]/g, '');
  return /^\d{8,15}$/.test(normalized);
}

function hiraganaToKatakana(value: string): string {
  return value.replace(/[ぁ-ゖ]/g, (m) => String.fromCharCode(m.charCodeAt(0) + 0x60));
}

export function InitialRegistrationScreen() {
  const { completeInitialRegistration, user, signOut } = useAuth();
  const [language, setLanguage] = useState<Language>('ja');
  const t = translations[language];
  const colors = Colors.light;

  const [name, setName] = useState(user?.name ?? '');
  const [furigana, setFurigana] = useState(user?.furigana ?? '');
  const [studentNumber, setStudentNumber] = useState(user?.studentNumber ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [grade, setGrade] = useState(user?.grade ?? '');
  const [category, setCategory] = useState<Category>(user?.category ?? 'japanese');
  const [pickedImage, setPickedImage] = useState<PickedStudentIdImage | null>(null);
  const [pickingImage, setPickingImage] = useState(false);

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const facultyOptions = FACULTIES[language];
  const departments = faculty ? facultyOptions[faculty] ?? [] : [];
  const isGraduateSchool = faculty !== '' && departments.length === 0;

  const gradeOptions = isGraduateSchool
    ? [
        { label: t.gradeM1, value: 'M1' },
        { label: t.gradeM2, value: 'M2' },
        { label: t.gradeD1, value: 'D1' },
        { label: t.gradeD2, value: 'D2' },
        { label: t.gradeD3, value: 'D3' },
        { label: t.gradeOther, value: 'other' },
      ]
    : [
        { label: t.grade1, value: '1' },
        { label: t.grade2, value: '2' },
        { label: t.grade3, value: '3' },
        { label: t.grade4, value: '4' },
        { label: t.gradeOther, value: 'other' },
      ];

  const isComposingRef = useRef(false);

  const handlePickImage = async () => {
    setPickingImage(true);
    setErrorMessage(null);
    try {
      const picked = await pickStudentIdImage();
      if (picked) setPickedImage(picked);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setPickingImage(false);
    }
  };

  const validate = (): boolean => {
    const normalizedStudentNumber = normalizeStudentNumber(studentNumber);
    if (normalizedStudentNumber !== studentNumber) setStudentNumber(normalizedStudentNumber);

    const nextErrors: Record<string, boolean> = {
      name: !name.trim(),
      furigana: !furigana.trim(),
      studentNumber: !normalizedStudentNumber || !validateStudentNumber(normalizedStudentNumber),
      phone: !phone || !validatePhoneNumber(phone),
      faculty: !faculty,
      department: !isGraduateSchool && !department,
      grade: !grade,
    };
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async () => {
    if (!validate()) {
      setErrorMessage(t.required);
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    const major = isGraduateSchool ? faculty : `${faculty} ${department}`;
    const { error } = await completeInitialRegistration(
      {
        name: name.trim(),
        furigana: furigana.trim(),
        studentNumber: normalizeStudentNumber(studentNumber),
        phone,
        major,
        grade,
        category,
        studentIdImage: '',
      },
      pickedImage?.blob
    );
    setSubmitting(false);
    if (error) setErrorMessage(error.message);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerRow}>
            <ThemedText type="subtitle">{t.title}</ThemedText>
            <Pressable onPress={() => setLanguage(language === 'ja' ? 'en' : 'ja')}>
              <ThemedText type="link" themeColor="tint">{language === 'ja' ? 'English' : '日本語'}</ThemedText>
            </Pressable>
          </View>
          <ThemedText type="small" themeColor="textSecondary">{t.subtitle}</ThemedText>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">{t.name}</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: errors.name ? '#D14343' : colors.border, color: colors.text }]}
              placeholder={t.namePlaceholder}
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={(v) => { setName(v); setErrors((prev) => ({ ...prev, name: false })); }}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">{t.furigana}</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: errors.furigana ? '#D14343' : colors.border, color: colors.text }]}
              placeholder={t.furiganaPlaceholder}
              placeholderTextColor={colors.textSecondary}
              value={furigana}
              onChangeText={(v) => {
                const next = isComposingRef.current ? v : hiraganaToKatakana(v);
                setFurigana(next);
                setErrors((prev) => ({ ...prev, furigana: false }));
              }}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">{t.studentNumber}</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: errors.studentNumber ? '#D14343' : colors.border, color: colors.text }]}
              placeholder={t.studentNumberPlaceholder}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              value={studentNumber}
              onChangeText={(v) => { setStudentNumber(normalizeStudentNumber(v)); setErrors((prev) => ({ ...prev, studentNumber: false })); }}
            />
            {errors.studentNumber && <ThemedText type="small" style={styles.errorText}>{t.studentNumberError}</ThemedText>}
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">{t.phone}</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: errors.phone ? '#D14343' : colors.border, color: colors.text }]}
              placeholder={t.phonePlaceholder}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(v) => { setPhone(v); setErrors((prev) => ({ ...prev, phone: false })); }}
            />
            {errors.phone && <ThemedText type="small" style={styles.errorText}>{t.phoneError}</ThemedText>}
          </View>

          <SelectField
            label={t.faculty}
            placeholder={t.facultyPlaceholder}
            value={faculty}
            error={errors.faculty}
            options={Object.keys(facultyOptions).map((f) => ({ label: f, value: f }))}
            onChange={(value) => {
              setFaculty(value);
              setDepartment('');
              setErrors((prev) => ({ ...prev, faculty: false }));
            }}
          />

          <SelectField
            label={t.department}
            placeholder={t.departmentPlaceholder}
            value={department}
            error={errors.department}
            disabled={!faculty || isGraduateSchool}
            options={departments.map((d) => ({ label: d, value: d }))}
            onChange={(value) => { setDepartment(value); setErrors((prev) => ({ ...prev, department: false })); }}
          />

          <SelectField
            label={t.grade}
            placeholder={t.gradePlaceholder}
            value={grade}
            error={errors.grade}
            options={gradeOptions}
            onChange={(value) => { setGrade(value); setErrors((prev) => ({ ...prev, grade: false })); }}
          />

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">{t.category}</ThemedText>
            {(['japanese', 'regular-international', 'exchange'] as const).map((cat) => (
              <Pressable
                key={cat}
                style={[styles.radioRow, { borderColor: colors.border }]}
                onPress={() => setCategory(cat)}
              >
                <View style={[styles.radioOuter, { borderColor: colors.tint }]}>
                  {category === cat && <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />}
                </View>
                <ThemedText>{cat === 'japanese' ? t.japanese : cat === 'regular-international' ? t.regularInternational : t.exchange}</ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">{t.studentIdLabel}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{t.studentIdHint}</ThemedText>
            <View style={[styles.imagePicker, { borderColor: colors.border }]}>
              {pickedImage && <Image source={{ uri: pickedImage.uri }} style={styles.imagePreview} />}
              <Pressable
                style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handlePickImage}
                disabled={pickingImage}
              >
                {pickingImage ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <ThemedText style={{ color: colors.text }}>{pickedImage ? t.changePhoto : t.choosePhoto}</ThemedText>
                )}
              </Pressable>
            </View>
          </View>

          {errorMessage && <ThemedText type="small" style={styles.errorText}>{errorMessage}</ThemedText>}

          <Pressable
            style={[styles.button, { backgroundColor: colors.tint }, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText style={styles.buttonText}>{t.submit}</ThemedText>}
          </Pressable>

          <Pressable onPress={() => void signOut()}>
            <ThemedText type="link" themeColor="tint" style={styles.signOutLink}>
              {language === 'ja' ? 'ログアウト' : 'Sign out'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
    marginTop: Spacing.one,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  imagePicker: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: Spacing.two,
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  errorText: {
    color: '#D14343',
  },
  signOutLink: {
    textAlign: 'center',
  },
});
