import '@testing-library/jest-dom';
import { act, cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { createRef } from 'react';
import { moorhenGlobalInstance } from '../../src/InstanceManager/MoorhenInstance';
import { MoorhenBackupSelect } from '../../src/components/select/MoorhenBackupSelect';
import { MoorhenReduxStore } from '../../src/store/MoorhenReduxStore';
import { MockTimeCapsule } from '../__mocks__/mockTimeCapsule';

describe('Testing MoorhenBackupSelect', () => {
    afterEach(cleanup);

    test('MoorhenBackupSelect label', () => {
        const selectRef = createRef(null);
        const timeCapsule = new MockTimeCapsule();
        moorhenGlobalInstance.setTimeCapsule(timeCapsule);

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenBackupSelect ref={selectRef} label="Test Label" />
            </Provider>
        );

        const labelNode = screen.getByText('Test Label');
        expect(labelNode).toBeVisible();

        const selectNode = screen.getByRole('combobox');
        expect(selectNode).toBeVisible();
    });

    test('MoorhenBackupSelect select maps', async () => {
        const selectRef = createRef(null);
        const timeCapsuleRef = createRef();

        const timeCapsule = new MockTimeCapsule();
        timeCapsuleRef.current = timeCapsule;

        await act(async () => {
            render(
                <Provider store={MoorhenReduxStore}>
                    <MoorhenBackupSelect ref={selectRef} timeCapsuleRef={timeCapsuleRef} />
                </Provider>
            );
        });

        const selectNode = screen.getByRole('combobox');
        const optionNode_1 = await screen.findByText('key-1');
        const optionNode_2 = await screen.findByText('key-2');
        const optionNode_3 = await screen.findByText('key-3');

        expect(selectNode).toBeVisible();
        expect(optionNode_1).toBeInTheDocument();
        expect(optionNode_2).toBeInTheDocument();
        expect(optionNode_3).toBeInTheDocument();
        expect(selectNode).toHaveValue(JSON.stringify({ label: 'key-1' }));

        const user = userEvent.setup();
        await act(async () => {
            await user.selectOptions(selectNode, ['key-3']);
        });

        expect(selectNode).toHaveValue(JSON.stringify({ label: 'key-3' }));
        expect(optionNode_3.selected).toBeTruthy();
        expect(selectRef.current.value).toBe(JSON.stringify({ label: 'key-3' }));
    });
});
