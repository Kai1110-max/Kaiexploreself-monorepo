import { UserAvatar } from './UserAvatar';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

export const Header = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="bg-white shadow-sm shadow-slate-600/20 flex justify-between items-center w-full max-w-full z-10 px-2 py-1">
      <div className="ml-2 font-bold text-gray-600">EmotionBridge</div>
      <div className="flex items-center gap-2">
        <Button size="small" onClick={toggleLanguage}>
          {i18n.language === 'en' ? '中文' : 'English'}
        </Button>
        <UserAvatar buttonClassName="my-1 mr-1" />
      </div>
    </div>
  );
};
