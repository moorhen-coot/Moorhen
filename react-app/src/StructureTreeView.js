import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import Tree, { TreeNode } from 'rc-tree';
import 'rc-tree/assets/index.css';
import './basic.less';

const dummyTreeData = [
{ key: '0', title: 'Demo tree (dummy data)',
children:
    [
    { key: '0-0', title: 'A',
children:
        [
        { key: '0-0-0', title: 'ALA 1',
children:
            [
            { key: '0-0-0-0', title: 'N' },
            { key: '0-0-0-1', title: 'CA' },
            { key: '0-0-0-2', title: 'C' },
            { key: '0-0-0-3', title: 'O' },
            ],
        },
        { key: '0-0-1', title: ' GLY 2',
children:
            [
            { key: '0-0-1-0', title: 'N' },
            { key: '0-0-1-1', title: 'CA' },
            { key: '0-0-1-2', title: 'C' },
            { key: '0-0-1-3', title: 'O' },
            ],
        },
        ],
    },
    { key: '0-1', title: 'B',
children:
        [
        { key: '0-1-0', title: 'ALA 1',
children:
            [
            { key: '0-1-0-0', title: 'N' },
            { key: '0-1-0-1', title: 'CA' },
            { key: '0-1-0-2', title: 'C' },
            { key: '0-1-0-3', title: 'O' },
            ],
        },
        { key: '0-1-1', title: ' GLY 2',
children:
            [
            { key: '0-1-1-0', title: 'N' },
            { key: '0-1-1-1', title: 'CA' },
            { key: '0-1-1-2', title: 'C' },
            { key: '0-1-1-3', title: 'O' },
            ],
        },
        ],
    },
    ],
},
    ];

class StructureTreeView extends React.Component {

    static propTypes = { keys: PropTypes.array, };

    static defaultProps = { keys: ['0'], };

    constructor(props) {
        super(props);
        const keys = props.keys;
        const treeIn = props.treeData;
        if(treeIn){
            this.state = { defaultExpandedKeys: keys, defaultCheckedKeys: keys, treeData: treeIn };
        } else {
            this.state = { defaultExpandedKeys: keys, defaultCheckedKeys: keys, treeData: dummyTreeData };
        }
    }

    onCheck = (checkedKeys, info) => {
        try {
            this.props.onChange({checkedKeys:checkedKeys});
        } catch(e) {
            //Ignore
        }
    };

    setData(tree){
        this.setState({treeData:tree});

    }

    render() {

        const treeData = this.state.treeData;

        return (
                <>
                <Tree
                showLine
                checkable
                selectable={ false }
                defaultCheckedKeys={this.state.defaultCheckedKeys}
                onCheck={this.onCheck}
                treeData={treeData}
                />
                </>
               );
    }
}

export default StructureTreeView;
