export type NotificationType = "success" | "error" | "warning" | "info" | "create" | "update" | "delete"

export interface Notification {
  id: string
  type: NotificationType
  message: string
  title?: string
  duration?: number
  onComplete?: () => void
}

type Listener = () => void

class NotificationStore {
  private notifications: Notification[] = []
  private listeners: Set<Listener> = new Set()
  private idCounter = 0

  add(notification: Omit<Notification, "id">): string {
    const id = `notification-${++this.idCounter}`
    this.notifications.push({ ...notification, id })
    this.notify()
    return id
  }

  remove(id: string): void {
    const notification = this.notifications.find((n) => n.id === id)
    if (notification?.onComplete) {
      notification.onComplete()
    }
    this.notifications = this.notifications.filter((n) => n.id !== id)
    this.notify()
  }

  getAll(): Notification[] {
    return [...this.notifications]
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }
}

export const notificationStore = new NotificationStore()

