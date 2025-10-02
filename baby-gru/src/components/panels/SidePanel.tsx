import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/MoorhenReduxStore';
import { setShowSidePanel } from '../../store/globalUISlice';
import './side-panels.css';

export const MoorhenSidePanel = (props: { width: number }) => {
    const dispatch = useDispatch();
    const height = useSelector((state: RootState) => state.sceneSettings.height);
    const isShown = useSelector((state: RootState) => state.globalUI.sidePanelIsShown);

    const toggle = (
        <button
            className={`moorhen__todo-container-toggle-button ${isShown ? 'moorhen__todo-container-toggle-button--visible' : ''}`}
            onClick={() => {
                dispatch(setShowSidePanel(!isShown));
            }}
        >
            {isShown ? 'Hide' : 'Show'}
        </button>
    );

    return (
        <>
            {toggle}
            <div
                style={{ width: `${props.width}px`, height: height }}
                className={`moorhen__todo-container ${isShown ? 'moorhen__todo-container--visible' : ''}`}
            >
                <div style={{ textAlign: 'center', fontWeight: 'bold', padding: '8px' }}>To-Do List</div>
                <div
                    style={{
                        border: '1px solid var(--moorhen-border)',
                        padding: '8px',
                        borderRadius: '4rem',
                        width: '90%',
                        margin: '0px',
                    }}
                >
                    Mock Todo Item
                </div>
                <div
                    style={{
                        border: '1px solid var(--moorhen-border)',
                        padding: '8px',
                        borderRadius: '4rem',
                        width: '90%',
                        margin: '8px',
                    }}
                >
                    Mock Todo Item
                </div>
                <div
                    style={{
                        border: '1px solid var(--moorhen-border)',
                        padding: '8px',
                        borderRadius: '4rem',
                        width: '90%',
                        margin: '8px',
                    }}
                >
                    Mock Todo Item
                </div>
                <div
                    style={{
                        border: '1px solid var(--moorhen-border)',
                        padding: '8px',
                        borderRadius: '4rem',
                        width: '90%',
                        margin: '8px',
                    }}
                >
                    Mock Todo Item
                </div>
                <div
                    style={{
                        border: '1px solid var(--moorhen-border)',
                        padding: '8px',
                        borderRadius: '4rem',
                        width: '90%',
                        margin: '8px',
                    }}
                >
                    Mock Todo Item
                </div>
                <div
                    style={{
                        border: '1px solid var(--moorhen-border)',
                        padding: '8px',
                        borderRadius: '4rem',
                        width: '90%',
                        margin: '8px',
                    }}
                >
                    Mock Todo Item
                </div>
            </div>
        </>
    );
};
