"use client";

import AppShell from "../../../app-shell/AppShell";

export default function SharedEventPage({ params }: { params: { token: string } }) {
  return <AppShell initialPage="login" sharedEventToken={params.token} />;
}
