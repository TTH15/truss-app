"use client";

import LegacyApp from "./LegacyApp";

export type {
  Language,
  RegistrationStep,
  User,
  Event,
  EventParticipant,
  Message,
  MessageThread,
  ChatThreadMetadata,
  Notification,
  BoardPost,
  BoardPostReply,
  GalleryPhoto,
} from "../domain/types/app";

export default function AppShell(props: {
  initialPage?: "landing" | "auth-selection" | "auth-complete" | "login" | "admin-login" | "email-verification" | "initial-registration" | "profile" | "dashboard" | "admin";
  standaloneAdmin?: boolean;
}) {
  return <LegacyApp {...props} />;
}
