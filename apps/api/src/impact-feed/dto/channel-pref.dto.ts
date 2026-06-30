import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** The feed channels a donor can opt into (E17). IN_APP is always on. */
export const FEED_CHANNELS = [
  'IN_APP',
  'EMAIL',
  'PUSH',
  'WHATSAPP',
  'TELEGRAM',
  'MESSENGER',
] as const;

export type FeedChannelDtoValue = (typeof FEED_CHANNELS)[number];

/** Set the opt-in (and optional handle) for one feed channel (E17). */
export class ChannelPrefDto {
  @IsIn(FEED_CHANNELS)
  channel!: FeedChannelDtoValue;

  @IsBoolean()
  optIn!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  handle?: string;
}
