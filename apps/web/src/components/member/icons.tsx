import type { ComponentProps } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHouse, faCalendarDays, faUsers, faImage, faEnvelope, faBell, faRightFromBracket,
  faXmark, faCheck, faClock, faCircleExclamation, faUpload, faFileLines,
  faComments, faShieldHalved, faHeart, faCamera, faLocationDot,
  faArrowUpRightFromSquare, faShareNodes, faPlus, faGlobe, faPaperPlane,
  faChevronDown, faTrashCan, faMagnifyingGlass, faPen, faPhone, faFloppyDisk,
  faGraduationCap, faIdCard, faImages, faCreditCard, type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';

function memberIcon(icon: IconDefinition) {
  return function MemberIcon(props: Omit<ComponentProps<typeof FontAwesomeIcon>, 'icon'>) {
    return <FontAwesomeIcon icon={icon} {...props} />;
  };
}

export const CreditCard = memberIcon(faCreditCard);
export const Home = memberIcon(faHouse);
export const Calendar = memberIcon(faCalendarDays);
export const Users = memberIcon(faUsers);
export const Image = memberIcon(faImage);
export const Images = memberIcon(faImages);
export const Mail = memberIcon(faEnvelope);
export const Bell = memberIcon(faBell);
export const LogOut = memberIcon(faRightFromBracket);
export const X = memberIcon(faXmark);
export const Check = memberIcon(faCheck);
export const Clock = memberIcon(faClock);
export const AlertCircle = memberIcon(faCircleExclamation);
export const Upload = memberIcon(faUpload);
export const FileText = memberIcon(faFileLines);
export const MessageCircle = memberIcon(faComments);
export const ShieldCheck = memberIcon(faShieldHalved);
export const Heart = memberIcon(faHeart);
export const Camera = memberIcon(faCamera);
export const MapPin = memberIcon(faLocationDot);
export const ExternalLink = memberIcon(faArrowUpRightFromSquare);
export const Share2 = memberIcon(faShareNodes);
export const Plus = memberIcon(faPlus);
export const Globe2 = memberIcon(faGlobe);
export const Send = memberIcon(faPaperPlane);
export const ChevronDown = memberIcon(faChevronDown);
export const Trash2 = memberIcon(faTrashCan);
export const Search = memberIcon(faMagnifyingGlass);
export const Edit = memberIcon(faPen);
export const Phone = memberIcon(faPhone);
export const Save = memberIcon(faFloppyDisk);
export const GraduationCap = memberIcon(faGraduationCap);
export const IdCard = memberIcon(faIdCard);
export const ImagePlus = memberIcon(faImages);
