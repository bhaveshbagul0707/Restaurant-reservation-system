export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface ReservationRow extends Record<string, unknown> {
  id: string;
  guest_name: string;
  email: string;
  phone: string;
  reservation_date: string;
  reservation_time: string;
  guests: number;
  table_number: number;
  sms_consent: boolean;
  status: 'confirmed' | 'cancelled';
  created_at: string;
  cancelled_at: string | null;
}

export interface NotificationRow extends Record<string, unknown> {
  id: string;
  reservation_id: string;
  channel: 'email' | 'sms';
  event_type: 'booking_confirmed' | 'booking_cancelled';
  recipient: string;
  payload: Json;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'skipped' | 'not_configured';
  attempts: number;
  last_error: string | null;
  provider_message_id: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

export interface AdminCredentialRow extends Record<string, unknown> {
  singleton: true;
  username: string;
  salt: string;
  password_hash: string;
  session_version: string;
  updated_at: string;
}

interface TableDefinition<
  Row extends Record<string, unknown>,
  Insert extends Record<string, unknown>,
  Update extends Record<string, unknown>,
> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      restaurant_tables: TableDefinition<
        { table_number: number; capacity: number; active: boolean },
        { table_number: number; capacity: number; active?: boolean },
        { capacity?: number; active?: boolean }
      >;
      reservations: TableDefinition<
        ReservationRow,
        {
          id?: string;
          guest_name: string;
          email: string;
          phone: string;
          reservation_date: string;
          reservation_time: string;
          guests: number;
          table_number: number;
          sms_consent?: boolean;
          status?: 'confirmed' | 'cancelled';
          created_at?: string;
          cancelled_at?: string | null;
        },
        Partial<ReservationRow>
      >;
      admin_credentials: TableDefinition<
        AdminCredentialRow,
        {
          singleton?: true;
          username: string;
          salt: string;
          password_hash: string;
          session_version: string;
          updated_at?: string;
        },
        Partial<AdminCredentialRow>
      >;
      reservation_notifications: TableDefinition<
        NotificationRow,
        {
          id?: string;
          reservation_id: string;
          channel: 'email' | 'sms';
          event_type: NotificationRow['event_type'];
          recipient: string;
          payload: Json;
          status?: NotificationRow['status'];
          attempts?: number;
          last_error?: string | null;
          provider_message_id?: string | null;
          created_at?: string;
          updated_at?: string;
          sent_at?: string | null;
        },
        Partial<NotificationRow>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_reservation: {
        Args: {
          p_guest_name: string;
          p_email: string;
          p_phone: string;
          p_reservation_date: string;
          p_reservation_time: string;
          p_guests: number;
          p_table_number: number;
          p_sms_consent?: boolean;
        };
        Returns: ReservationRow[];
      };
      cancel_reservation: {
        Args: { p_reservation_id: string };
        Returns: Json;
      };
      consume_api_rate_limit: {
        Args: { p_rate_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
