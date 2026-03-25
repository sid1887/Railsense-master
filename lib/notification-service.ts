/**
 * Notification Service
 * Handles push notifications, email notifications, and notification management
 */

import { dbRun, dbAll } from '@/lib/database';
import { log } from '@/lib/logger';

interface NotificationPayload {
  userId: number;
  type: 'alert' | 'delay' | 'promotion' | 'system';
  title: string;
  message: string;
  trainNumber?: string;
  actionUrl?: string;
}

/**
 * Firebase Cloud Messaging push notification service
 */
export async function sendPushNotification(userId: number, payload: NotificationPayload) {
  try {
    // TODO: Integrate Firebase Cloud Messaging
    // For now, store in database for WebSocket delivery

    await dbRun(
      `INSERT INTO user_notifications
       (user_id, notification_type, title, message, train_number, delivery_method, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [userId, payload.type, payload.title, payload.message, payload.trainNumber, 'push']
    );

    return true;
  } catch (error) {
    log.error('Push notification error', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * SendGrid email notification service
 */
export async function sendEmailNotification(
  userId: number,
  email: string,
  subject: string,
  htmlTemplate: string
) {
  try {
    // TODO: Integrate SendGrid
    // For now, log notification

    await dbRun(
      `INSERT INTO user_notifications
       (user_id, notification_type, title, message, delivery_method, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [userId, 'email', subject, htmlTemplate, 'email']
    );

    return true;
  } catch (error) {
    log.error('Email notification error', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Store notification in database
 */
export async function saveNotification(payload: NotificationPayload) {
  try {
    const result = await dbRun(
      `INSERT INTO user_notifications
       (user_id, notification_type, title, message, train_number, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 0, datetime('now'))`,
      [payload.userId, payload.type, payload.title, payload.message, payload.trainNumber || null]
    );

    return result.id > 0;
  } catch (error) {
    log.error('Save notification error', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get user notifications
 */
export async function getUserNotifications(userId: number, limit = 20) {
  try {
    return await dbAll<any>(
      `SELECT * FROM user_notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );
  } catch (error) {
    log.error('Fetch notifications error', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: number) {
  try {
    await dbRun(
      `UPDATE user_notifications SET is_read = 1 WHERE id = ?`,
      [notificationId]
    );
    return true;
  } catch (error) {
    log.error('Mark as read error', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Create alert notification for train delay
 */
export async function notifyTrainDelay(
  userId: number,
  trainNumber: string,
  trainName: string,
  delayMinutes: number
) {
  const payload: NotificationPayload = {
    userId,
    type: 'delay',
    title: `${trainName} (${trainNumber}) is delayed`,
    message: `Delay of ${delayMinutes} minutes detected`,
    trainNumber,
    actionUrl: `/train/${trainNumber}`,
  };

  await saveNotification(payload);
  await sendPushNotification(userId, payload);
}

/**
 * Create alert notification for halt
 */
export async function notifyTrainHalt(
  userId: number,
  trainNumber: string,
  trainName: string,
  station: string
) {
  const payload: NotificationPayload = {
    userId,
    type: 'alert',
    title: `${trainName} (${trainNumber}) halted`,
    message: `Train stopped unexpectedly at ${station}`,
    trainNumber,
    actionUrl: `/train/${trainNumber}`,
  };

  await saveNotification(payload);
  await sendPushNotification(userId, payload);
}

/**
 * Create system notification
 */
export async function notifySystem(userId: number, title: string, message: string) {
  const payload: NotificationPayload = {
    userId,
    type: 'system',
    title,
    message,
  };

  await saveNotification(payload);
}

export const notificationService = {
  sendPushNotification,
  sendEmailNotification,
  saveNotification,
  getUserNotifications,
  markAsRead,
  notifyTrainDelay,
  notifyTrainHalt,
  notifySystem,
};
