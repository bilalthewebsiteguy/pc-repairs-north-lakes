// Picks a Lucide icon for a service name (first matching keyword wins).
// Shared by ServiceDirectory (North Lakes page) and the Services page.
import AppWindow from '@lucide/astro/icons/app-window';
import BatteryCharging from '@lucide/astro/icons/battery-charging';
import Bitcoin from '@lucide/astro/icons/bitcoin';
import Briefcase from '@lucide/astro/icons/briefcase';
import Bug from '@lucide/astro/icons/bug';
import CalendarCheck from '@lucide/astro/icons/calendar-check';
import Cloud from '@lucide/astro/icons/cloud';
import Cpu from '@lucide/astro/icons/cpu';
import DatabaseBackup from '@lucide/astro/icons/database-backup';
import FileText from '@lucide/astro/icons/file-text';
import Gauge from '@lucide/astro/icons/gauge';
import Globe from '@lucide/astro/icons/globe';
import GraduationCap from '@lucide/astro/icons/graduation-cap';
import HardDriveDownload from '@lucide/astro/icons/hard-drive-download';
import HeartHandshake from '@lucide/astro/icons/heart-handshake';
import Laptop from '@lucide/astro/icons/laptop';
import LifeBuoy from '@lucide/astro/icons/life-buoy';
import Mail from '@lucide/astro/icons/mail';
import Monitor from '@lucide/astro/icons/monitor';
import MonitorCog from '@lucide/astro/icons/monitor-cog';
import Palette from '@lucide/astro/icons/palette';
import PcCase from '@lucide/astro/icons/pc-case';
import Printer from '@lucide/astro/icons/printer';
import RefreshCw from '@lucide/astro/icons/refresh-cw';
import Router from '@lucide/astro/icons/router';
import SearchCheck from '@lucide/astro/icons/search-check';
import Server from '@lucide/astro/icons/server';
import ShieldCheck from '@lucide/astro/icons/shield-check';
import Smartphone from '@lucide/astro/icons/smartphone';
import Users from '@lucide/astro/icons/users';
import Wifi from '@lucide/astro/icons/wifi';
import Wrench from '@lucide/astro/icons/wrench';

export type Icon = typeof Wrench;

const iconRules: [RegExp, Icon][] = [
  [/battery/i, BatteryCharging],
  [/screen/i, Monitor],
  [/laptop sales/i, Laptop],
  [/apple|mac/i, Laptop],
  [/laptop/i, Laptop],
  [/security/i, ShieldCheck],
  [/virus|spyware/i, Bug],
  [/tune/i, Gauge],
  [/cloud/i, Cloud],
  [/backup|transfer/i, DatabaseBackup],
  [/recovery/i, HardDriveDownload],
  [/email|domain/i, Mail],
  [/troubleshoot/i, LifeBuoy],
  [/hardware/i, Cpu],
  [/insurance/i, FileText],
  [/mobile/i, Smartphone],
  [/operating|windows/i, MonitorCog],
  [/wireless|nbn/i, Wifi],
  [/equipment/i, Printer],
  [/software/i, AppWindow],
  [/training/i, GraduationCap],
  [/build/i, PcCase],
  [/seo|search engine/i, SearchCheck],
  [/logo|pamphlet|phamplet|business card/i, Palette],
  [/redesign|update/i, RefreshCw],
  [/hosting/i, Globe],
  [/website/i, Globe],
  [/gsuite|office 365/i, Briefcase],
  [/server/i, Server],
  [/preventative|maintenance/i, CalendarCheck],
  [/advice/i, HeartHandshake],
  [/isp|deal/i, Router],
  [/crypto/i, Bitcoin],
  [/family/i, Users],
  [/setup|set up/i, MonitorCog],
  [/repair/i, Wrench],
];

export const serviceIcon = (name: string): Icon => iconRules.find(([re]) => re.test(name))?.[1] ?? Wrench;

// Extra search words people type that the WordPress text doesn't use (search only, not shown)
const synonyms: [RegExp, string][] = [
  [/wireless|network|nbn|isp/i, 'wifi wi-fi internet router modem broadband'],
  [/virus|spyware|security/i, 'malware hacked scam antivirus ransomware'],
  [/screen/i, 'display cracked broken lcd monitor'],
  [/tune|maintenance/i, 'slow speed fast clean'],
  [/backup|recovery|cloud/i, 'lost files photos deleted restore'],
  [/battery/i, 'charge charging power'],
  [/mac|apple/i, 'macbook imac'],
  [/email|domain|gsuite|office/i, 'outlook gmail microsoft'],
  [/printer|equipment/i, 'printer scanner webcam'],
  [/operating|windows/i, 'windows 11 reinstall'],
];
export const serviceSearchWords = (name: string) => synonyms.filter(([re]) => re.test(name)).map(([, w]) => w).join(' ');
