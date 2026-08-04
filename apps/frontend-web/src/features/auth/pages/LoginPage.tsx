import { useCallback, useState } from 'react';
import { Button, Card, Form, Input, Tabs, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch } from '../../../redux/hooks';
import { FormItem } from 'react-hook-form-antd';
import { loginWithPasscode, registerUser } from '../reducer';
import { useTranslation } from 'react-i18next';

const loginSchema = yup
  .object({
    passcode: yup.string().trim().min(5).required(),
  })
  .required();

const registerSchema = yup
  .object({
    alias: yup.string().trim().required('Name/Alias is required'),
    passcode: yup.string().trim().min(5).required('Passcode must be at least 5 chars'),
    secretCode: yup.string().trim().required('Invite Secret Code is required'),
  })
  .required();

export const LoginPage = () => {
  const { control: loginControl, handleSubmit: handleLoginSubmit } = useForm<{ passcode: string }>({
    resolver: yupResolver(loginSchema),
  });

  const { control: registerControl, handleSubmit: handleRegisterSubmit } = useForm<{ alias: string, passcode: string, secretCode: string }>({
    resolver: yupResolver(registerSchema),
  });

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('login');

  const signIn: SubmitHandler<{ passcode: string }> = useCallback(
    (values: { passcode: string }) => {
      dispatch(
        loginWithPasscode(values.passcode, () => {
          navigate('/app');
        })
      );
    },
    [dispatch, navigate]
  );

  const register: SubmitHandler<{ alias: string, passcode: string, secretCode: string }> = useCallback(
    (values) => {
      dispatch(
        registerUser(values.alias, values.passcode, false, values.secretCode, () => {
          message.success('Registered successfully!');
          navigate('/app');
        }, () => {
          message.error('Failed to register. Please check your secret code.');
        })
      );
    },
    [dispatch, navigate]
  );

  const [t] = useTranslation()

  return (
    <div className="container mx-auto justify-center items-center flex h-[100vh] overflow-auto">
      <Card
        rootClassName="justify-center min-w-[30%]"
        title={<span className="text-center block text-xl">{t("SignIn.Title") || "Action Research Platform"}</span>}
        bordered={false}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
          <Tabs.TabPane tab="Login" key="login">
            <Form onFinish={handleLoginSubmit(signIn)} layout="vertical" className="w-full flex flex-col gap-2 mt-4">
              <FormItem
                control={loginControl}
                name="passcode"
                rootClassName="m-0"
              >
                <Input.Password placeholder={t("SignIn.Passcode.Prompt") || "Enter your passcode"} autoFocus/>
              </FormItem>
              <Button rootClassName="self-stretch mt-4" htmlType="submit" type="primary" size="large">
                {t("SignIn.Enter") || "Login"}
              </Button>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Register" key="register">
            <Form onFinish={handleRegisterSubmit(register)} layout="vertical" className="w-full flex flex-col gap-2 mt-4">
              <FormItem
                control={registerControl}
                name="alias"
                rootClassName="m-0"
              >
                <Input placeholder="Your Name or Alias" />
              </FormItem>
              <FormItem
                control={registerControl}
                name="passcode"
                rootClassName="m-0"
              >
                <Input.Password placeholder="Create a Passcode (min 5 chars)" />
              </FormItem>
              <FormItem
                control={registerControl}
                name="secretCode"
                rootClassName="m-0"
              >
                <Input placeholder="Invite Secret Code (e.g., ACTION2026)" />
              </FormItem>
              <Button rootClassName="self-stretch mt-4" htmlType="submit" type="primary" size="large">
                Register & Start
              </Button>
            </Form>
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default LoginPage