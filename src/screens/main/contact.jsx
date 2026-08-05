import { useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useMutation } from '@tanstack/react-query'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'

import Button from '@/components/Button'
import TextField from '@/components/TextField'
import { useNotify } from '@/components/NotificationProvider'
import { sendContactMessage } from '@/api/pages'
import { useAuth } from '@/auth/AuthContext'
import { useTranslate } from '@/lib/i18n'
import { useLayout } from '@/lib/responsive'
import { useGoBack } from '@/lib/useGoBack'
import { mutationErrors } from '@/lib/formErrors'
import { colors, fonts, radii, spacing } from '@/theme'

/**
 * Contact us, matching the web app's form.
 *
 * Name and email are prefilled from the signed-in profile, because this is
 * reached from Profile and asking someone to retype what the app already knows
 * is friction for nothing. Both stay editable: a learner may want a reply
 * somewhere other than the address they signed up with.
 *
 * The message lands in `contact_messages` and shows up in the admin panel.
 */
export default function ContactScreen() {
  const t = useTranslate()
  const insets = useSafeAreaInsets()
  const { size, contentWidth } = useLayout()
  const goBack = useGoBack('/profile')
  const notify = useNotify()
  const { user } = useAuth()

  const emailRef = useRef(null)
  const messageRef = useRef(null)

  const [name, setName] = useState(user?.fullName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [message, setMessage] = useState('')

  const send = useMutation({
    mutationFn: sendContactMessage,
    onSuccess: () => {
      notify.success(t('m_contact_sent'))
      setMessage('')
      goBack()
    },
  })

  const { fieldErrors, message: errorMessage } = mutationErrors(send.error)

  const submit = () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      notify.error(t('m_contact_incomplete'))
      return
    }

    send.mutate({ name: name.trim(), email: email.trim(), message: message.trim() })
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('m_back')}
          onPress={goBack}
          hitSlop={10}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={22} color={colors.secondary[600]} strokeWidth={2.4} />
        </Pressable>
        <Text style={[styles.headerTitle, { fontSize: size(19) }]}>{t('m_profile_contact')}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 56}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { width: contentWidth, alignSelf: 'center' }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>{t('m_contact_intro')}</Text>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <TextField
            label={t('m_contact_name')}
            value={name}
            onChangeText={setName}
            error={fieldErrors.name}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />

          <TextField
            ref={emailRef}
            label={t('m_contact_email')}
            value={email}
            onChangeText={setEmail}
            error={fieldErrors.email}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => messageRef.current?.focus()}
          />

          <TextField
            ref={messageRef}
            label={t('m_contact_message')}
            value={message}
            onChangeText={setMessage}
            error={fieldErrors.message}
            multiline
            numberOfLines={6}
            maxLength={5000}
            textAlignVertical="top"
            style={styles.messageField}
            inputStyle={styles.messageInput}
          />

          <Button
            label={t('m_contact_send')}
            onPress={submit}
            loading={send.isPending}
            disabled={send.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  fill: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary[100],
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.display,
    color: colors.secondary[800],
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  intro: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.secondary[500],
  },
  error: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.danger[600],
  },
  messageField: {
    minHeight: 140,
  },
  messageInput: {
    minHeight: 120,
    paddingTop: spacing.sm,
  },
})
