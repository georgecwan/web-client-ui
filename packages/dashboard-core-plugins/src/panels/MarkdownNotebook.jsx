import React, { PureComponent } from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@deephaven/components';
import { Code } from '@deephaven/console';
import { vsPlay } from '@deephaven/icons';
import './MarkdownNotebook.scss';

export class MarkdownNotebook extends PureComponent {
  constructor(props) {
    super(props);

    this.handleRunSelected = this.handleRunSelected.bind(this);
    this.renderCodeBlock = this.renderCodeBlock.bind(this);
    this.renderLink = this.renderLink.bind(this);

    // Map of each code block from it's starting line number to the code within that block
    this.commands = new Map();
    this.codeElements = new Map();
    this.editorScrollView = React.createRef();

    this.state = {
      hasCode: false,

      // Keep track if any code has been executed yet. If not, make the run button flash
      hasRunCode: false,

      // Line of the next block to execute. Null to start at the first block
      nextStartLine: null,
    };
  }

  componentDidMount() {
    this.updateHasCode();
  }

  componentDidUpdate() {
    this.updateHasCode();
  }

  updateHasCode() {
    const { hasCode } = this.state;
    if (this.commands.size === 0 && hasCode) {
      this.setState({ hasCode: false });
    } else if (this.commands.size > 0 && !hasCode) {
      this.setState({ hasCode: true });
    }
  }

  /**
   * @param {number|null} line The line of the code block to start from
   * @returns {number} The next line of the code block to start from
   */
  getNextStartLine(line) {
    const keys = [...this.commands.keys()];
    const nextIndex = keys.findIndex(key => key === line) + 1;
    if (nextIndex >= keys.length) {
      // We got to the last block, disable
      return null;
    }

    return keys[nextIndex];
  }

  handleRunSelected(event) {
    event.preventDefault();
    event.stopPropagation();

    const { nextStartLine } = this.state;
    const keys = [...this.commands.keys()];
    const keyIndex = keys.findIndex(
      key => key === nextStartLine || nextStartLine == null
    );
    if (keyIndex < 0) {
      return;
    }
    const startLine = keys[keyIndex];
    const command = this.commands.get(startLine);
    const newNextStartLine = this.getNextStartLine(startLine);
    const element = this.codeElements.get(startLine)?.current;
    const nextElement = element?.parentElement?.nextElementSibling;
    if (nextElement) {
      const { offsetTop } = nextElement;
      const top = offsetTop;
      this.editorScrollView.current.scroll({
        top,
        left: 0,
      });
    }

    this.runCode(command);
    this.setState({ nextStartLine: newNextStartLine });
  }

  runCode(command) {
    const { onRunCode } = this.props;
    onRunCode(command);

    this.setState({ hasRunCode: true });
  }

  renderCodeBlock(props) {
    const { children, className, inline, node } = props;
    const { hasRunCode, nextStartLine } = this.state;
    const { children: nodeChildren, position } = node;
    const { start } = position;
    const { line } = start;
    const command = nodeChildren[0].value;
    const ref = React.createRef();
    const isFirstBlock = this.commands.size === 0;
    const isSelected =
      nextStartLine === line ||
      (isFirstBlock && nextStartLine == null && !hasRunCode);
    const language = className?.startsWith('language-')
      ? className.substring(9)
      : 'plaintext';

    if (inline) {
      return <code className={className}>{children}</code>;
    }

    this.commands.set(line, command);
    this.codeElements.set(line, ref);

    return (
      <div
        className={classNames('markdown-notebook-code-block', {
          'is-selected': isSelected,
        })}
        ref={ref}
        onClick={() => {
          this.setState({ nextStartLine: line });
        }}
        role="presentation"
      >
        <Button
          kind="ghost"
          icon={vsPlay}
          className="btn-play-block"
          onClick={event => {
            event.stopPropagation();
            event.preventDefault();

            this.runCode(command);
            this.setState({ nextStartLine: line });
          }}
          tooltip="Run code"
        />
        <code>
          <Code language={language}>
            {React.Children.map(children, child =>
              typeof child === 'string' ? child.trim() : child
            )}
          </Code>
        </code>
      </div>
    );
  }

  renderLink(props) {
    const { onLinkClick } = this.props;
    const { href, children, target } = props;
    return (
      <a href={href} onClick={onLinkClick} target={target}>
        {children}
      </a>
    );
  }

  render() {
    const { content, transformImageUri, transformLinkUri } = this.props;
    const { hasCode, hasRunCode, nextStartLine } = this.state;
    return (
      <div className="markdown-notebook">
        <div className="markdown-notebook-toolbar">
          <Button
            className={classNames('btn-play-selected-cell', {
              flashing: hasCode && !hasRunCode,
            })}
            kind="ghost"
            icon={vsPlay}
            onClick={this.handleRunSelected}
            tooltip="Run code and select next"
            disabled={(hasRunCode && nextStartLine == null) || !hasCode}
          >
            Run Selected Code
          </Button>
        </div>
        <div className="markdown-notebook-content" ref={this.editorScrollView}>
          <Markdown
            components={{ code: this.renderCodeBlock, a: this.renderLink }}
            linkTarget="_blank"
            remarkPlugins={[remarkGfm]}
            transformLinkUri={transformLinkUri}
            transformImageUri={transformImageUri}
            includeElementIndex
          >
            {content}
          </Markdown>
        </div>
      </div>
    );
  }
}

MarkdownNotebook.propTypes = {
  onRunCode: PropTypes.func,
  content: PropTypes.string,
  onLinkClick: PropTypes.func,
  transformImageUri: PropTypes.func,
  transformLinkUri: PropTypes.func,
};

MarkdownNotebook.defaultProps = {
  content: '',
  onLinkClick: undefined,
  onRunCode: () => {},
  transformImageUri: undefined,
  transformLinkUri: undefined,
};

export default MarkdownNotebook;
