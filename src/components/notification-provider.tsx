"use client"

import { useState, useEffect } from "react"
import { NotificationContainer } from "@/components/notification/notification-container"
import { notificationStore } from "@/lib/notification-store"

export function NotificationProvider() {
  const [notifications, setNotifications] = useState(() => notificationStore.getAll())

  useEffect(() => {
    const unsubscribe = notificationStore.subscribe(() => {
      setNotifications([...notificationStore.getAll()])
    })
    return unsubscribe
  }, [])

  return (
    <NotificationContainer
      notifications={notifications}
      onRemove={(id) => notificationStore.remove(id)}
    />
  )
}
