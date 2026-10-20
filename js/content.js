/* =========================================================
   C++ 交互式课堂 · 课程内容
   内容依据工作区「文档.txt」「文档1.txt」整理并扩展
   ========================================================= */

(function () {
  'use strict';

  /* ---------------- 文本与代码辅助 ---------------- */

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function dedent(text) {
    const raw = String(text).replace(/^\n+|\n+$/g, '').split('\n');
    let indent = Infinity;
    raw.forEach(function (line) {
      if (!line.trim()) return;
      const match = line.match(/^[ \t]*/);
      indent = Math.min(indent, match ? match[0].length : 0);
    });
    if (!isFinite(indent)) indent = 0;
    return raw.map(function (line) {
      return line.slice(Math.min(indent, line.length));
    }).join('\n');
  }

  const TYPE_WORDS = [
    'int', 'bool', 'char', 'void', 'unsigned', 'long', 'short', 'float',
    'double', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'size_t',
    'int32_t', 'int16_t'
  ];

  const KEYWORDS = [
    'class', 'struct', 'public', 'private', 'protected', 'const', 'constexpr',
    'return', 'if', 'else', 'while', 'for', 'new', 'delete', 'namespace',
    'using', 'template', 'typename', 'static', 'inline', 'explicit', 'operator',
    'this', 'sizeof', 'break', 'continue', 'switch', 'case', 'default', 'do',
    'auto', 'virtual', 'override', 'final', 'friend', 'typedef', 'enum',
    'union', 'extern', 'noexcept', 'try', 'catch', 'throw', 'nullptr',
    'true', 'false', 'NULL'
  ];

  const TOKEN_RE = new RegExp(
    '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)' +          // 1 comment
    '|("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\')' + // 2 string / char
    '|(^[ \\t]*#[^\\n]*)' +                             // 3 preprocessor
    '|\\b(' + KEYWORDS.join('|') + ')\\b' +              // 4 keyword
    '|\\b([A-Za-z_]\\w*)(?=\\s*\\()' +                   // 5 function
    '|\\b(\\d+(?:\\.\\d+)?)\\b',                         // 6 number
    'gm'
  );

  function highlightCpp(code) {
    let result = '';
    let last = 0;
    let match;
    TOKEN_RE.lastIndex = 0;

    while ((match = TOKEN_RE.exec(code)) !== null) {
      result += escapeHtml(code.slice(last, match.index));
      const token = match[0];
      let cls = 'tok-punc';

      if (match[1]) {
        cls = 'tok-comment';
      } else if (match[2]) {
        cls = 'tok-str';
      } else if (match[3]) {
        cls = 'tok-pre';
      } else if (match[4]) {
        cls = TYPE_WORDS.indexOf(token) >= 0 ? 'tok-type' : 'tok-kw';
      } else if (match[5]) {
        cls = 'tok-fn';
      } else if (match[6]) {
        cls = 'tok-num';
      }

      result += '<span class="' + cls + '">' + escapeHtml(token) + '</span>';
      last = match.index + token.length;
    }

    result += escapeHtml(code.slice(last));
    return result;
  }

  function cb(file, code, lang) {
    return [
      '<div class="code-block">',
      '  <div class="code-head">',
      '    <span class="code-dots" aria-hidden="true"><i></i><i></i><i></i></span>',
      '    <span class="code-file">' + escapeHtml(file) + '</span>',
      '    <span class="code-lang">' + escapeHtml(lang || 'C++') + '</span>',
      '    <button class="copy-btn" type="button" title="复制这段代码">复制</button>',
      '  </div>',
      '  <pre><code>' + highlightCpp(dedent(code)) + '</code></pre>',
      '</div>'
    ].join('\n');
  }

  function outBlock(lines, label) {
    return [
      '<div class="output-block">',
      '  <div class="output-head"><span class="out-dot"></span>' + escapeHtml(label || '程序输出') + '</div>',
      '  <pre>' + lines.map(escapeHtml).join('\n') + '</pre>',
      '</div>'
    ].join('\n');
  }

  function callout(kind, title, body) {
    const label = {
      note: 'NOTE',
      tip: 'TIP',
      warn: 'WATCH OUT',
      danger: 'ERROR',
      deep: 'DEEPER'
    }[kind] || 'NOTE';
    return [
      '<div class="callout ' + kind + '">',
      '  <div class="callout-title">' + escapeHtml(label) + ' · ' + escapeHtml(title) + '</div>',
      '  <div class="callout-body">' + body + '</div>',
      '</div>'
    ].join('\n');
  }

  function same(command, expected) {
    return command.replace(/\s+/g, '').replace(/;+$/g, '') ===
      expected.replace(/\s+/g, '').replace(/;+$/g, '');
  }

  /* ---------------- 课程数据 ---------------- */

  const chapters = [
    {
      id: 'ch1',
      title: '从 C 结构体到类',
      cards: [
        {
          id: 'c1-why',
          title: '没有类的世界',
          lead: '先用 C 的方式保存电机状态，看看“数据”和“操作”分开时，约定为什么容易失守。',
          tags: ['C 结构体', '问题动机'],
          viz: 'cstruct',
          lab: 'motor',
          file: 'motor_c.c',
          focus: [4, 5, 6],
          snippet: `
            typedef struct {
                int speed;
                int enabled;
            } MotorState;

            void set_speed(MotorState *m, int speed);

            /* 调用者可以绕过函数，直接改字段 */
            motor.speed = -100;
          `,
          staticOutput: [
            'speed = -100',
            '（C 编译器不会阻止这行赋值）',
            '约定被绕过，电机状态可能非法。'
          ],
          content: `
            <p>上一节我们用 C 的结构体保存相关数据，用函数处理这些数据：</p>
            ${cb('motor_c.c', `
              typedef struct {
                  int speed;
                  int enabled;
              } MotorState;

              void set_speed(MotorState *motor, int speed);
            `, 'C')}
            <p>这段代码本身没有问题。问题在于：<strong>结构体只保存数据，函数只是“外部工具”</strong>。编译器不知道 <code>set_speed</code> 和 <code>MotorState</code> 之间有什么约定，也不知道速度必须落在 0～100。</p>

            <h2>三个容易出错的场景</h2>
            <ol class="steps">
              <li><strong>配错函数。</strong>项目里有很多电机、很多操作，调用者需要自己记住哪个函数该操作哪个结构体。</li>
              <li><strong>绕过检查。</strong>只要写出 <code>motor.speed = -100;</code>，编译器就会接受。约定的有效性完全依赖调用者的自觉。</li>
              <li><strong>忘记初始化。</strong>定义一个结构体变量后，字段可能是未初始化的随机值；没有任何机制强制在“出生”时建立合法状态。</li>
            </ol>

            <h2>是 C 不好吗？</h2>
            <p>不是。C 也能写出可靠的电机模块，靠的是严格的编码规范、代码评审、测试和命名约定。只是这些约定大多<strong>不在编译器里</strong>，而在人的脑子里。</p>
            <p>C++ 的类想解决的是同一件事的另一面：把</p>
            <ul>
              <li><strong>数据</strong>（编号、速度、使能状态），</li>
              <li><strong>操作这些数据的函数</strong>（设置速度、使能、读取状态），</li>
              <li><strong>谁能访问什么</strong>（public / private），</li>
            </ul>
            <p>放进同一个语言结构，让编译器参与检查。</p>

            ${callout('note', '先建立问题意识', '接下来看到的 <code>public</code>、<code>private</code>、构造函数和 <code>const</code> 并不是为了“语法好看”，而是在回答这一节留下的三个问题：<strong>数据由谁保护？对象如何初始化？谁能修改它？</strong>')}

            <p>下一节先看一个完整的类，不急着记住所有语法，只观察它的组织方式。</p>
          `,
          task: null
        },
        {
          id: 'c1-first-class',
          title: '第一个 Motor 类',
          lead: '把数据、操作和访问规则放进同一个 class，然后创建一个真正独立的对象。',
          tags: ['class', '对象', '成员'],
          viz: 'class',
          lab: 'motor',
          file: 'motor.cpp',
          focus: [4, 5, 6, 7],
          snippet: `
            class Motor {
            public:
                Motor(int id = 0)
                    : id_(id), speed_(0), enabled_(false) {}

                bool setSpeed(int speed) {
                    if (speed < 0 || speed > 100)
                        return false;
                    speed_ = speed;
                    return true;
                }

                int speed() const { return speed_; }

            private:
                int id_;
                int speed_;
                bool enabled_;
            };
          `,
          content: `
            <p>下面是一份完整的 C++ 示例。请先注意它的<strong>组织方式</strong>，再逐段看语法。</p>

            ${cb('motor.cpp', `
              #include <cstdio>

              class Motor {
              public:
                  Motor(int id = 0) : id_(id), speed_(0), enabled_(false) {}

                  bool setSpeed(int speed)
                  {
                      if (speed < 0 || speed > 100) {
                          return false;
                      }
                      speed_ = speed;
                      return true;
                  }

                  void enable()
                  {
                      enabled_ = true;
                  }

                  int id() const { return id_; }
                  int speed() const { return speed_; }
                  bool isEnabled() const { return enabled_; }

              private:
                  int id_;
                  int speed_;
                  bool enabled_;
              };

              int main()
              {
                  Motor motor(1);
                  motor.enable();

                  if (!motor.setSpeed(80)) {
                      std::printf("设置速度失败\\n");
                  }

                  std::printf("电机%d：使能=%d，速度=%d\\n",
                              motor.id(),
                              motor.isEnabled(),
                              motor.speed());
                  return 0;
              }
            `)}

            <h2>先看骨架</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th>部分</th><th>代码</th><th>作用</th></tr></thead>
                <tbody>
                  <tr><td>类头</td><td><code>class Motor { ... };</code></td><td>定义一种新类型，名字叫 <code>Motor</code></td></tr>
                  <tr><td>访问区</td><td><code>public:</code> / <code>private:</code></td><td>规定谁能访问下面的成员；注意末尾的冒号</td></tr>
                  <tr><td>数据成员</td><td><code>id_</code>、<code>speed_</code>、<code>enabled_</code></td><td>每个对象各保存一份状态</td></tr>
                  <tr><td>成员函数</td><td><code>setSpeed</code>、<code>enable</code>、<code>speed</code></td><td>操作这个对象自己的数据</td></tr>
                  <tr><td>构造函数</td><td><code>Motor(int id = 0)</code></td><td>创建对象时初始化成员</td></tr>
                </tbody>
              </table>
            </div>

            <h2>类与对象</h2>
            <p><code>Motor</code> 是<strong>类</strong>，可以理解为“这一类对象长什么样、能做什么”的定义；<code>motor</code> 是按这个定义创建出来的<strong>对象</strong>，也叫实例。</p>
            ${cb('two_motors.cpp', `
              Motor leftMotor(1);
              Motor rightMotor(2);

              leftMotor.setSpeed(60);
              rightMotor.setSpeed(90);
            `)}
            <p>两次调用的是同一份 <code>setSpeed</code> 代码，但操作的是两份不同的数据。类像图纸，对象像按图纸造出来的具体设备。</p>

            ${callout('warn', '类定义末尾的分号', '写完 <code>class Motor { ... }</code> 后不要漏掉最后的分号。这是初学者最常见的编译错误之一，报错位置有时会让编译器“指错行”。')}

            <h2>怎么运行</h2>
            <p>保存为 <code>motor.cpp</code>，用支持 C++17 的编译器：</p>
            ${cb('终端', `
              g++ -std=c++17 -Wall -Wextra motor.cpp -o motor
              ./motor
            `, 'Shell')}
            <p>在 Windows + MinGW 环境下，第二步通常写成 <code>motor.exe</code> 或直接 <code>.\\motor.exe</code>。</p>

            <p>右侧实验台已经准备好一个可交互的 <code>Motor</code> 模拟器。先输入下面的语句，创建一个编号为 1 的对象，观察上方“对象模型”的变化。</p>
          `,
          task: {
            prompt: '在实验台输入 <code>Motor motor(1)</code>，创建一个编号为 1 的电机对象。',
            steps: [
              { label: '构造 motor(1)', test: function (cmd) { return same(cmd, 'Motor motor(1)'); } }
            ]
          }
        }
      ]
    },

    {
      id: 'ch2',
      title: '封装：让规则住在类里',
      cards: [
        {
          id: 'c2-access',
          title: 'public / private：谁可以碰数据',
          lead: '把“能调用的操作”和“不能直接碰的实现”分开，让编译器替你挡住一部分误用。',
          tags: ['public', 'private', '封装'],
          viz: 'class',
          lab: 'motor',
          file: 'motor.cpp',
          focus: [4, 5, 16, 17, 18],
          snippet: `
            class Motor {
            public:
                bool setSpeed(int speed);
                int speed() const;
            private:
                int id_;
                int speed_;
                bool enabled_;
            };

            motor.setSpeed(80);   // OK
            motor.speed_ = -100;  // 编译错误
          `,
          content: `
            <p>类中的变量和函数统称为<strong>成员</strong>。访问限定符决定外部代码能使用哪些成员。</p>

            <div class="table-wrap">
              <table>
                <thead><tr><th>限定符</th><th>谁能访问</th><th>典型用途</th></tr></thead>
                <tbody>
                  <tr><td><code>public</code></td><td>类外部、类内部都可以</td><td>公开的操作接口，例如 <code>setSpeed()</code>、<code>speed()</code></td></tr>
                  <tr><td><code>private</code></td><td>只有这个类自己的成员函数（以及友元等特殊位置）</td><td>内部数据和实现细节，例如 <code>speed_</code></td></tr>
                </tbody>
              </table>
            </div>

            ${cb('access.cpp', `
              class Motor {
              public:
                  bool setSpeed(int speed) {
                      if (speed < 0 || speed > 100) return false;
                      speed_ = speed;
                      return true;
                  }
                  int speed() const { return speed_; }

              private:
                  int id_;
                  int speed_;
                  bool enabled_;
              };
            `)}

            <p>因此，外部可以调用：</p>
            ${cb('use.cpp', `
              motor.setSpeed(80);   // 通过公开接口修改
              int s = motor.speed(); // 通过公开接口读取
            `)}
            <p>却不能直接写：</p>
            ${cb('forbidden.cpp', `
              motor.speed_ = -100; // 编译错误：speed_ 是 private 成员
            `)}
            <p>编译器给出的信息可能类似：</p>
            ${outBlock([
              "error: 'speed_' is a private member of 'Motor'",
              "note: declared private here"
            ], '编译输出（示意）')}

            <h2>封装到底封了什么</h2>
            <p>“对外提供操作、把内部细节收起来”的做法叫<strong>封装</strong>。它带来的直接好处是：调用者不需要知道 <code>speed_</code> 叫什么、存在哪里，只需要使用稳定的接口。</p>
            <p>更重要的是，<strong>修改数据必须经过成员函数</strong>，于是成员函数有机会先检查规则：</p>
            ${cb('checked.cpp', `
              bool setSpeed(int speed) {
                  if (speed < 0 || speed > 100) {
                      return false;
                  }
                  speed_ = speed;
                  return true;
              }
            `)}

            ${callout('warn', 'private 不是“加密”', '访问控制是编译期规则，用来防止<strong>误用</strong>，不是安全防护。不要用指针偏移、<code>#define private public</code> 这类技巧绕过它；那只是把 bug 藏得更深。')}

            ${callout('note', '默认权限不同', '<code>class</code> 中第一个访问限定符之前的成员默认是 <code>private</code>；<code>struct</code> 中默认是 <code>public</code>。建议总是显式写出 <code>public:</code> 和 <code>private:</code>，让读者一眼看清设计意图。')}

            <p>现在请在实验台里亲自制造一次编译错误：输入 <code>motor.speed_ = -100</code>。实验台会模拟编译器的拒绝，而不会真的改变对象状态。</p>
          `,
          task: {
            prompt: '输入 <code>motor.speed_ = -100</code>，观察 private 成员被拒绝的编译错误。',
            steps: [
              { label: '触发 private 错误', test: function (cmd) { return same(cmd, 'motor.speed_ = -100'); } }
            ]
          }
        },
        {
          id: 'c2-invariant',
          title: '不变量：让非法状态难以出现',
          lead: '“速度必须在 0～100”不是一句注释，而应成为类在每次操作后都保持的性质。',
          tags: ['不变量', '校验', '返回值'],
          viz: 'class',
          lab: 'motor',
          file: 'motor.cpp',
          focus: [4, 5, 6, 7, 8],
          snippet: `
            bool setSpeed(int speed)
            {
                if (speed < 0 || speed > 100) {
                    return false;   // 拒绝非法值
                }
                speed_ = speed;     // 合法才写入
                return true;
            }
          `,
          content: `
            <p>我们希望在任意时刻都成立的规则，称为<strong>不变量</strong>（invariant）。对这个 <code>Motor</code> 来说，最基本的不变量是：</p>
            ${callout('note', 'Motor 的不变量', '<code>speed_</code> 始终在 0～100 之间；<code>enabled_</code> 始终是明确的真/假；对象一旦成功构造，这些成员就已经有合法初值。')}

            <p>构造函数负责建立初始状态，<code>setSpeed</code> 负责在修改时守住规则：</p>
            ${cb('invariant.cpp', `
              bool setSpeed(int speed)
              {
                  if (speed < 0 || speed > 100) {
                      return false;
                  }
                  speed_ = speed;
                  return true;
              }
            `)}
            <p>调用者必须检查返回值：</p>
            ${cb('caller.cpp', `
              if (!motor.setSpeed(150)) {
                  std::printf("设置速度失败，当前速度仍是 %d\\n", motor.speed());
              }
            `)}
            ${outBlock([
              '设置速度失败，当前速度仍是 0'
            ])}

            <h2>为什么不直接夹紧到 0～100？</h2>
            <p>你当然可以设计成“超范围就自动取边界值”，但那是另一种业务规则。当前设计选择<strong>拒绝并报告失败</strong>，因为对电机控制来说，悄悄改变调用者的意图可能更危险。关键是：规则要明确、一致，并且写进代码。</p>

            <h2>封装不等于自动正确</h2>
            <p>如果 <code>setSpeed</code> 自己写错了，比如忘记检查上界，不变量仍然会破。封装只是把“修改入口”收拢到一个地方，让检查和测试有明确的落点；它不能替代正确的实现。</p>
            <ul>
              <li>构造函数是否把所有成员都初始化？</li>
              <li>每个修改状态的公开函数是否维持了不变量？</li>
              <li>读取函数是否只读，是否加了 <code>const</code>？</li>
              <li>失败时对象是否保持原状？</li>
            </ul>

            <p>请在实验台输入 <code>motor.setSpeed(150)</code>，观察返回值、对象速度和上方输出。注意：速度应该保持不变。</p>
          `,
          task: {
            prompt: '输入 <code>motor.setSpeed(150)</code>，观察非法值被拒绝，且 <code>speed_</code> 不被修改。',
            steps: [
              { label: '尝试非法速度', test: function (cmd) { return same(cmd, 'motor.setSpeed(150)'); } }
            ]
          }
        },
        {
          id: 'c2-member-fn',
          title: '成员函数：同一份代码，操作不同对象',
          lead: '成员函数知道“我是被哪个对象调用的”，这就是它和普通函数最关键的差别。',
          tags: ['成员函数', 'this', '多对象'],
          viz: 'class',
          lab: 'motor',
          file: 'motor.cpp',
          focus: [3, 4, 5, 6, 7, 8],
          snippet: `
            bool setSpeed(int speed) {
                if (speed < 0 || speed > 100)
                    return false;
                speed_ = speed;   // 等价于 this->speed_
                return true;
            }

            motor.setSpeed(80);    // this == &motor
            right.setSpeed(90);    // this == &right
          `,
          content: `
            <p>调用 <code>motor.setSpeed(80)</code> 时，进入成员函数后，代码里的 <code>speed_</code> 指的就是 <code>motor</code> 自己的 <code>speed_</code>。如果创建第二个对象，同一个函数会操作第二个对象的数据。</p>

            ${cb('two_objects.cpp', `
              Motor leftMotor(1);
              Motor rightMotor(2);

              leftMotor.setSpeed(60);
              rightMotor.setSpeed(90);

              // leftMotor.speed_ == 60
              // rightMotor.speed_ == 90
            `)}

            <h2>隐藏的 this</h2>
            <p>每个非静态成员函数都有一个隐式参数 <code>this</code>，它指向“当前被调用的那个对象”。所以：</p>
            <div class="table-wrap">
              <table>
                <thead><tr><th>你写的</th><th>可以理解为</th></tr></thead>
                <tbody>
                  <tr><td><code>motor.setSpeed(80)</code></td><td><code>setSpeed(&amp;motor, 80)</code></td></tr>
                  <tr><td>函数体里的 <code>speed_</code></td><td><code>this-&gt;speed_</code></td></tr>
                  <tr><td>函数体里的 <code>speed()</code></td><td><code>this-&gt;speed()</code></td></tr>
                </tbody>
              </table>
            </div>
            <p>这是理解成员函数的关键：<strong>函数代码只有一份，但每次调用都绑定到具体对象。</strong></p>

            ${callout('deep', '为什么普通函数要显式传结构体指针？', 'C 函数没有“当前对象”这个概念，所以必须写成 <code>set_speed(&amp;motor, 80)</code>，把对象地址作为参数传进去。C++ 成员函数把这一步变成了隐式的 <code>this</code>，调用语法因此更自然，但底层仍然是在操作某个具体对象的地址。')}

            <h2>对象通常用 . 调用</h2>
            <p>手里是对象本身时用 <code>.</code>；手里是指向对象的指针时用 <code>-&gt;</code>。下一章会专门讲指针，这里先记住形状：</p>
            ${cb('dot_and_arrow.cpp', `
              motor.setSpeed(80);       // 对象 -> 点
              Motor* p = &motor;
              p->setSpeed(70);          // 指针 -> 箭头
            `)}

            <p>实验台里先创建两个对象，再分别设置速度，观察上方两张对象卡片是否各自独立。</p>
          `,
          task: {
            prompt: '先输入 <code>Motor left(1)</code> 创建对象，再输入 <code>left.setSpeed(60)</code> 设置速度。',
            steps: [
              { label: '创建 left(1)', test: function (cmd) { return same(cmd, 'Motor left(1)'); } },
              { label: 'left.setSpeed(60)', test: function (cmd) { return same(cmd, 'left.setSpeed(60)'); } }
            ]
          }
        },
        {
          id: 'c2-class-struct',
          title: 'class 还是 struct？',
          lead: '在 C++ 里两者都能有成员函数，主要差别是默认访问权限；选择更多是设计习惯。',
          tags: ['class', 'struct', '默认权限'],
          viz: 'compare',
          lab: 'motor',
          file: 'compare.cpp',
          focus: [1, 2, 3, 5, 6],
          snippet: `
            struct Point {   // 默认 public
                int x;
                int y;
            };

            class Motor {    // 默认 private
                int speed_;  // 没有写 public，外部不可访问
            public:
                bool setSpeed(int s);
            };
          `,
          content: `
            <p>上一节已经见过 C 的 <code>struct</code>。在 C++ 中，<code>struct</code> 也能定义成员函数、构造函数和访问限定符，它和 <code>class</code> 的<strong>唯一核心语法差别</strong>是默认访问权限：</p>

            <div class="table-wrap">
              <table>
                <thead><tr><th>关键字</th><th>未写访问限定符时</th><th>常见设计习惯</th></tr></thead>
                <tbody>
                  <tr><td><code>class</code></td><td>成员默认 <code>private</code></td><td>需要维护不变量、封装内部状态的对象</td></tr>
                  <tr><td><code>struct</code></td><td>成员默认 <code>public</code></td><td>简单的数据集合、参数包、透明的值类型</td></tr>
                </tbody>
              </table>
            </div>

            ${cb('point.cpp', `
              struct Point {
                  int x;
                  int y;
              };

              Point p{3, 4};
              int sum = p.x + p.y;  // 数据就是公开的
            `)}

            ${cb('motor.cpp', `
              class Motor {
              public:
                  bool setSpeed(int speed);
                  int speed() const;
              private:
                  int speed_;
              };
            `)}

            <p>这是<strong>习惯</strong>，不是强制规定。你完全可以用 <code>struct</code> 写一个带 private 的复杂类，也可以用 <code>class</code> 写一个全 public 的数据包；但这样会让读代码的人感到意外。</p>

            ${callout('tip', '一个实用的判断', '如果这个类型的核心价值是“把几个值放在一起”，并且外部直接读写字段不会破坏任何规则，用 <code>struct</code>；如果它需要保护不变量、维护生命周期或隐藏实现，用 <code>class</code>。')}

            <p>注意：C 里常见的 <code>typedef struct Node { ... } Node;</code> 在 C++ 中通常不需要 <code>typedef</code>，直接写 <code>struct Node { ... };</code> 就可以用 <code>Node</code> 作为类型名。</p>
          `,
          quiz: {
            q: '下面哪句话是正确的？',
            options: [
              'C++ 的 struct 不能有成员函数',
              'class 的成员默认是 public，struct 的成员默认是 private',
              'class 和 struct 都可以有构造函数，主要默认访问权限不同',
              '只有 class 能实现封装，struct 不能'
            ],
            answer: 2,
            explain: '两者都能定义成员函数、构造函数和访问限定符。核心语法差别是默认访问权限：class 默认 private，struct 默认 public；封装能力并不由关键字决定。'
          }
        }
      ]
    },

    {
      id: 'ch3',
      title: '构造、对象与 const',
      cards: [
        {
          id: 'c3-constructor',
          title: '构造函数：对象出生时就把状态立好',
          lead: '构造函数不是“普通函数”，它负责让对象从第一刻起就处于合法状态。',
          tags: ['构造函数', '初始化列表'],
          viz: 'class',
          lab: 'motor',
          file: 'motor.cpp',
          focus: [3, 4, 5, 6],
          snippet: `
            class Motor {
            public:
                Motor(int id = 0)
                    : id_(id), speed_(0), enabled_(false) {}

            private:
                int id_;
                int speed_;
                bool enabled_;
            };
          `,
          content: `
            <p>创建对象时自动调用的特殊成员函数，叫<strong>构造函数</strong>。它和类同名，没有返回类型：</p>
            ${cb('constructor.cpp', `
              class Motor {
              public:
                  Motor(int id = 0)
                      : id_(id), speed_(0), enabled_(false) {}

              private:
                  int id_;
                  int speed_;
                  bool enabled_;
              };

              Motor motor(1);  // 调用 Motor(int)
              Motor spare;     // 也调用 Motor(int)，id 取默认值 0
            `)}

            <h2>初始化列表</h2>
            <p>冒号后面的部分叫<strong>成员初始化列表</strong>：</p>
            ${cb('init_list.cpp', `
              Motor(int id = 0)
                  : id_(id), speed_(0), enabled_(false)
              {
                  // 函数体在成员初始化之后执行
              }
            `)}
            <p>成员初始化列表设置对象的初始状态：</p>
            ${outBlock([
              'id_      ← 1',
              'speed_   ← 0',
              'enabled_ ← false'
            ], '构造 motor(1) 后')}
            <p>它与“在函数体里赋值”不同：成员在进入函数体之前就已经初始化，初始化列表直接构造它们。对于 <code>const</code> 成员、引用成员等必须初始化的成员，初始化列表往往是唯一选择。</p>

            ${callout('warn', '初始化顺序看声明顺序', '成员的实际初始化顺序由它们在类中的<strong>声明顺序</strong>决定，而不是初始化列表里的书写顺序。把列表顺序写成与声明顺序一致，可以避免“看起来先初始化 A，实际先初始化 B”的隐蔽 bug。')}

            <h2>默认参数与默认构造</h2>
            <p><code>int id = 0</code> 让调用者可以省略编号，于是 <code>Motor spare;</code> 也能创建一个对象。这不等同于编译器自动生成的默认构造函数，而是这个构造函数带默认参数。</p>
            ${cb('default_arg.cpp', `
              Motor a(1);  // id_ = 1
              Motor b;     // id_ = 0
            `)}

            ${callout('tip', '下划线命名只是习惯', '<code>id_</code> 末尾的下划线没有特殊语法作用，只是常见约定，用来区分参数 <code>id</code> 和成员 <code>id_</code>。你也可以用 <code>m_id</code> 或 <code>id</code>，只要团队统一。')}

            <h2>single-argument 构造函数的隐式转换</h2>
            <p>如果没有 <code>explicit</code>，只接受一个参数的构造函数可能被用于隐式转换：</p>
            ${cb('implicit.cpp', `
              Motor m = 3;  // 可能被解释为 Motor(3)
            `)}
            <p>如果不希望这种写法，可以把构造函数声明为 <code>explicit Motor(int id = 0);</code>。本课程的示例为了贴近原文，没有加 <code>explicit</code>；在真实项目中，单参数构造函数通常值得考虑。</p>

            <p>实验台里输入 <code>Motor right(2)</code>，观察构造完成后 <code>id_</code>、<code>speed_</code>、<code>enabled_</code> 的初值。</p>
          `,
          task: {
            prompt: '输入 <code>Motor right(2)</code>，观察构造函数如何一次性建立编号、速度和使能状态。',
            steps: [
              { label: '构造 right(2)', test: function (cmd) { return same(cmd, 'Motor right(2)'); } }
            ]
          }
        },
        {
          id: 'c3-multi-object',
          title: '多个对象：各有一份成员',
          lead: '同一个类可以创建任意多个对象；成员函数共享代码，数据成员各存一份。',
          tags: ['对象', '独立状态'],
          viz: 'class',
          lab: 'motor',
          file: 'objects.cpp',
          focus: [1, 2, 3, 4, 5, 6],
          snippet: `
            Motor left(1);
            Motor right(2);

            left.setSpeed(60);
            right.setSpeed(90);

            // left.speed_  == 60
            // right.speed_ == 90
          `,
          content: `
            <p>类定义的是“这一类对象共同的形状和行为”，每个对象则拥有自己的成员存储：</p>
            ${cb('objects.cpp', `
              Motor left(1);
              Motor right(2);

              left.setSpeed(60);
              right.setSpeed(90);
            `)}
            ${outBlock([
              'left  : id=1, speed=60, enabled=0',
              'right : id=2, speed=90, enabled=0'
            ], '两个对象的状态')}
            <p>调用 <code>left.setSpeed(60)</code> 不会影响 <code>right</code>。这也是“对象”与“类”的区别：类只有一份定义，对象可以有很多个，各自保存状态。</p>

            <h2>对象里到底存了什么</h2>
            <p>对本例的 <code>Motor</code> 来说，每个对象至少保存 <code>id_</code>、<code>speed_</code>、<code>enabled_</code> 三个成员。成员函数代码不复制到每个对象里，它们共享同一份代码，通过隐藏的 <code>this</code> 知道该操作谁。</p>
            <p>真实的对象大小还会受到内存对齐和填充的影响。例如三个 <code>int</code>/<code>bool</code> 成员之间可能有填充字节；不要假设成员在内存中紧密相连，也不要用 <code>memcpy</code> 随意复制含指针或非平凡成员的对象。</p>

            ${callout('warn', '对象复制不是“深拷贝”保证', '写 <code>Motor copy = left;</code> 时，编译器默认逐成员复制。对本例这种只含 <code>int</code>/<code>bool</code> 的对象没问题；如果成员里有裸指针，默认复制只会复制地址，两个对象可能指向同一块资源，销毁时容易重复释放。这类问题属于“三法则/五法则”，需要单独学习。')}

            <p>实验台里创建两个对象，分别设置不同速度，观察上方是否出现两张独立的状态卡。</p>
          `,
          task: {
            prompt: '依次创建 <code>Motor left(1)</code>、<code>Motor right(2)</code>，再输入 <code>right.setSpeed(90)</code>。',
            steps: [
              { label: '创建 left(1)', test: function (cmd) { return same(cmd, 'Motor left(1)'); } },
              { label: '创建 right(2)', test: function (cmd) { return same(cmd, 'Motor right(2)'); } },
              { label: 'right.setSpeed(90)', test: function (cmd) { return same(cmd, 'right.setSpeed(90)'); } }
            ]
          }
        },
        {
          id: 'c3-pointer',
          title: '对象指针：. 与 -> 的分工',
          lead: '指针保存对象地址；通过指针访问成员要用箭头，背后是解引用加成员访问。',
          tags: ['指针', '->', 'nullptr'],
          viz: 'class',
          lab: 'motor',
          file: 'pointer.cpp',
          focus: [1, 2, 3, 4, 5, 6],
          snippet: `
            Motor motor(1);
            Motor* p = &motor;

            p->setSpeed(70);     // 推荐
            (*p).setSpeed(70);   // 等价写法

            if (p != nullptr) {
                p->enable();
            }
          `,
          content: `
            <p>对象可以放在栈上，也可以由指针指向它。<code>&amp;</code> 取地址，<code>*</code> 解引用：</p>
            ${cb('pointer.cpp', `
              Motor motor(1);
              Motor* p = &motor;

              p->setSpeed(70);
              (*p).setSpeed(70);  // 与上一行等价
            `)}
            <div class="table-wrap">
              <table>
                <thead><tr><th>写法</th><th>含义</th><th>适用对象</th></tr></thead>
                <tbody>
                  <tr><td><code>motor.setSpeed(70)</code></td><td>对象直接访问成员</td><td>对象本身</td></tr>
                  <tr><td><code>p-&gt;setSpeed(70)</code></td><td>通过指针访问成员</td><td>指向对象的指针</td></tr>
                  <tr><td><code>(*p).setSpeed(70)</code></td><td>先解引用得到对象，再用点访问</td><td>等价于箭头，但不常用</td></tr>
                </tbody>
              </table>
            </div>
            <p><code>p-&gt;member</code> 可以理解为 <code>(*p).member</code> 的简写。箭头不是另一种“成员”，它只是语法糖。</p>

            ${callout('warn', '空指针不能解引用', '如果 <code>p == nullptr</code>，那么 <code>p-&gt;setSpeed(70)</code> 是未定义行为，通常直接崩溃。使用可能为空的指针前先检查：<code>if (p != nullptr) { ... }</code>。C++ 中用 <code>nullptr</code>，不要用 <code>NULL</code> 或 <code>0</code> 表示空指针。')}

            <h2>常见错误</h2>
            ${cb('wrong.cpp', `
              Motor* p = &motor;
              p.setSpeed(70);   // 错误：p 是指针，应使用 ->
              motor->speed();   // 错误：motor 是对象，应使用 .
            `)}
            <p>编译器通常会提示 <code>did you mean to use '-&gt;'?</code> 或相反的提示。看到这类错误，先检查左边是对象还是指针。</p>

            ${callout('danger', '不要返回局部对象的指针', '局部对象在函数返回时生命周期结束，返回它的地址会得到悬空指针。要么按值返回对象，要么让对象的生命周期由调用者管理。')}

            <p>请在实验台完成两步：先创建指针，再通过指针修改速度。注意上方内存视图中的箭头会指向同一个对象。</p>
          `,
          task: {
            prompt: '先输入 <code>Motor* p = &motor</code> 创建指针，再输入 <code>p-&gt;setSpeed(70)</code>。',
            steps: [
              { label: '创建指针 p', test: function (cmd) { return same(cmd, 'Motor* p = &motor'); } },
              { label: 'p->setSpeed(70)', test: function (cmd) { return same(cmd, 'p->setSpeed(70)'); } }
            ]
          }
        },
        {
          id: 'c3-const',
          title: 'const 成员函数：只读的承诺',
          lead: '函数后面的 const 表示“不会修改这个对象”；它让只读对象也能安全地查询状态。',
          tags: ['const', '只读对象'],
          viz: 'class',
          lab: 'motor',
          file: 'const.cpp',
          focus: [4, 5, 6, 7, 8],
          snippet: `
            int speed() const {
                return speed_;      // 只读
            }

            void enable() {         // 非 const
                enabled_ = true;
            }

            const Motor cm(2);
            cm.speed();             // OK
            cm.setSpeed(50);        // 编译错误
          `,
          content: `
            <p>注意查询函数的写法：</p>
            ${cb('getter.cpp', `
              int speed() const
              {
                  return speed_;
              }
            `)}
            <p>函数参数列表后面的 <code>const</code> 表示：<strong>这个成员函数承诺不修改对象的普通成员状态</strong>。因此，查询速度、编号、使能状态的函数都适合这样写。</p>

            ${cb('const_methods.cpp', `
              int id() const { return id_; }
              int speed() const { return speed_; }
              bool isEnabled() const { return enabled_; }

              bool setSpeed(int speed);  // 修改状态，不能加 const
              void enable();             // 修改状态，不能加 const
            `)}

            <h2>const 对象只能调用 const 成员函数</h2>
            ${cb('const_object.cpp', `
              const Motor cm(2);

              int s = cm.speed();     // OK：speed() 是 const
              cm.setSpeed(50);        // 编译错误：setSpeed() 不是 const
            `)}
            <p>为什么？因为 <code>cm</code> 被声明为只读对象，编译器不允许任何可能修改它的调用。<code>setSpeed</code> 没有 <code>const</code> 承诺，所以被拒绝。</p>
            ${outBlock([
              "error: 'this' argument to member function 'setSpeed'",
              '       has type \'const Motor\', but function is not marked const'
            ], '编译输出（示意）')}

            <h2>const 指针的两种读法</h2>
            ${cb('const_pointer.cpp', `
              const Motor* cp = &motor;  // 不能通过 cp 修改对象
              cp->speed();               // OK
              cp->setSpeed(50);          // 编译错误

              Motor* const pc = &motor;  // 指针本身不能改指向
              pc->setSpeed(50);          // OK：对象仍可修改
            `)}
            <p>读法是从右往左：<code>const Motor*</code> 是“指向 const Motor 的指针”，<code>Motor* const</code> 是“const 指针，指向 Motor”。初学阶段先掌握第一种即可。</p>

            ${callout('tip', 'const 是一种文档', '看到成员函数后面的 <code>const</code>，可以把它当作阅读提示：这个操作主要用于查看对象，不会改变状态。它既帮助编译器检查，也帮助后来的读者快速判断函数的意图。')}

            <p>实验台里先输入 <code>const Motor cm(2)</code> 创建只读对象，再尝试 <code>cm.setSpeed(50)</code> 观察错误，最后输入 <code>cm.speed()</code> 验证只读查询仍然可用。</p>
          `,
          task: {
            prompt: '创建 <code>const Motor cm(2)</code>，尝试 <code>cm.setSpeed(50)</code>，再查询 <code>cm.speed()</code>。',
            steps: [
              { label: '创建 const 对象', test: function (cmd) { return same(cmd, 'const Motor cm(2)'); } },
              { label: '触发 const 错误', test: function (cmd) { return same(cmd, 'cm.setSpeed(50)'); } },
              { label: '只读查询 speed()', test: function (cmd) { return same(cmd, 'cm.speed()'); } }
            ]
          }
        }
      ]
    },

    {
      id: 'ch4',
      title: '指针与引用补遗',
      cards: [
        {
          id: 'c4-reference',
          title: '引用：C++ 给参数的另一条路',
          lead: '为什么 C 的函数参数常写成指针，而 C++ 可以写成引用？两者语义不同，但经常解决同一个问题。',
          tags: ['引用', '函数参数', '别名'],
          viz: 'ref',
          lab: 'motor',
          file: 'reference.cpp',
          focus: [1, 2, 3, 4, 5, 6],
          snippet: `
            // C：需要显式取地址，函数内需要解引用
            void set_speed(MotorState* m, int speed);

            // C++：引用是已有对象的别名
            void set_speed(Motor& m, int speed)
            {
                m.speed = speed;  // 像普通对象一样使用
            }
          `,
          content: `
            <p>文档里提到一个很典型的问题：为什么 C 语言函数入参要写成</p>
            ${cb('c_style.c', `
              int foo(int *p);
            `, 'C')}
            <p>而不能写成</p>
            ${cb('cpp_style.cpp', `
              int bar(int &p);
            `)}
            <p>后者是 C++ 特有的<strong>引用</strong>语法。引用不是“取地址”，而是给一个已经存在的对象起别名。</p>

            ${cb('alias.cpp', `
              int x = 1;
              int& r = x;   // r 是 x 的别名，不是新整数

              r = 5;
              // 此时 x 也是 5
            `)}
            ${outBlock([
              'x = 5',
              'r = 5',
              '&x 与 &r 指向同一块存储（示意）'
            ])}

            <h2>用引用传参</h2>
            ${cb('by_reference.cpp', `
              void setSpeed(Motor& motor, int speed)
              {
                  motor.setSpeed(speed);
              }

              Motor m(1);
              setSpeed(m, 80);  // 不需要写 &m
            `)}
            <p>函数接收到的是原对象的别名，函数内修改 <code>motor</code> 就是修改调用者的对象。相比指针版本：</p>
            ${cb('by_pointer.cpp', `
              void setSpeed(Motor* motor, int speed)
              {
                  if (motor == nullptr) return;  // 必须考虑空指针
                  motor->setSpeed(speed);
              }

              Motor m(1);
              setSpeed(&m, 80);  // 需要显式取地址
            `)}

            <div class="table-wrap">
              <table>
                <thead><tr><th>维度</th><th>指针</th><th>引用</th></tr></thead>
                <tbody>
                  <tr><td>是否可以为空</td><td>可以，<code>nullptr</code></td><td>不可以，必须绑定对象</td></tr>
                  <tr><td>能否换绑</td><td>可以改变指向</td><td>初始化后不能换绑</td></tr>
                  <tr><td>调用语法</td><td>需要 <code>&amp;</code> / <code>*</code> / <code>-&gt;</code></td><td>像普通对象一样</td></tr>
                  <tr><td>典型用途</td><td>可选对象、数组、所有权转移</td><td>输出参数、避免大对象复制</td></tr>
                </tbody>
              </table>
            </div>

            <h2>const 引用</h2>
            <p>如果函数只需要读取一个大对象，用 <code>const Motor&amp;</code> 可以避免复制，同时承诺不修改：</p>
            ${cb('const_ref.cpp', `
              void printStatus(const Motor& motor)
              {
                  std::printf("电机%d，速度%d\\n", motor.id(), motor.speed());
              }
            `)}
            <p>它还能绑定临时对象，例如 <code>printStatus(Motor(3));</code>，这是非 const 引用做不到的。</p>

            ${callout('danger', '不要返回局部变量的引用', '引用必须指向仍然活着的对象。函数返回后局部变量已销毁，返回它的引用或指针都会悬空。按值返回通常更安全，编译器还会做返回值优化。')}

            <p>引用本身不复制对象，也不一定在内存中占一个独立位置；编译器通常把它实现成“自动解引用的指针”，但这是实现细节，写代码时应按“别名”语义理解。</p>
          `,
          quiz: {
            q: '关于 C++ 引用，下面哪句话正确？',
            options: [
              '引用可以重新绑定到另一个对象',
              '引用必须初始化，并且之后一直指向同一个对象',
              '引用可以为空，所以调用前要检查 nullptr',
              '引用一定会复制一份对象'
            ],
            answer: 1,
            explain: '引用在初始化时必须绑定到一个对象，之后不能换绑；它不能为空，也不复制对象。指针才可以改变指向或为空。'
          }
        },
        {
          id: 'c4-choose',
          title: '值、指针、引用怎么选',
          lead: '不要背“指针更高级”之类的结论；根据是否可空、是否需要修改、是否拥有资源来选择。',
          tags: ['设计选择', '参数传递'],
          viz: 'ref',
          lab: 'motor',
          file: 'choose.cpp',
          focus: [1, 2, 3, 4, 5],
          snippet: `
            void byValue(int x);                 // 小对象，读一份副本
            void byRef(Motor& m);                // 要修改调用者对象
            void byConstRef(const Motor& m);     // 只读，避免复制
            void byPointer(Motor* m);            // 可选，可能为空
          `,
          content: `
            <p>三种方式没有绝对优劣，关键看语义。</p>

            <div class="table-wrap">
              <table>
                <thead><tr><th>场景</th><th>建议</th><th>理由</th></tr></thead>
                <tbody>
                  <tr><td>小的标量参数（<code>int</code>、<code>bool</code>）</td><td>按值</td><td>复制成本低，语义最简单</td></tr>
                  <tr><td>只读的大对象</td><td><code>const T&amp;</code></td><td>避免复制，同时不允许修改</td></tr>
                  <tr><td>需要修改调用者的对象</td><td><code>T&amp;</code></td><td>函数内的修改直接作用到原对象</td></tr>
                  <tr><td>参数可以为空 / 可选</td><td><code>T*</code>（或 <code>std::optional</code>）</td><td>指针能表达“没有对象”</td></tr>
                  <tr><td>需要转移/共享所有权</td><td>智能指针</td><td>本课程不展开，但不要用裸指针表达所有权</td></tr>
                </tbody>
              </table>
            </div>

            ${cb('signatures.cpp', `
              void reset(int& value);                 // 修改
              void print(const Motor& motor);         // 只读
              bool tryEnable(Motor* motor);           // 可能没有对象
              Motor makeMotor(int id);                // 按值返回
            `)}

            <h2>关于返回值</h2>
            <p>返回大型对象时，直接按值返回通常没问题，编译器会做返回值优化（RVO/NRVO）。不要为了“性能”返回局部对象的指针或引用，那是悬空引用，属于未定义行为。</p>

            ${callout('warn', '裸指针不等于所有权', '一个 <code>Motor*</code> 参数只说明“可能指向某个 Motor”，并不说明函数是否负责 delete 它。所有权需要明确的设计（谁创建、谁释放、何时释放），否则很容易泄漏或重复释放。')}

            <h2>把选择变成习惯</h2>
            <ol class="steps">
              <li>先问：这个参数<strong>允许为空</strong>吗？允许，用指针。</li>
              <li>再问：函数需要<strong>修改</strong>调用者的对象吗？需要，用非 const 引用。</li>
              <li>只读且对象较大？用 <code>const</code> 引用。</li>
              <li>只是小标量？按值最清楚。</li>
            </ol>

            <p>这套判断同样适用于链表节点：遍历时用指针（可能为空），修改节点内容时用引用（确定存在），只读打印时用 <code>const Node&amp;</code>。</p>
          `,
          quiz: {
            q: '一个函数只读取大型对象、不修改它，参数最适合写成？',
            options: [
              '大对象按值传递',
              '非 const 引用',
              'const 引用',
              '一定用裸指针并检查 nullptr'
            ],
            answer: 2,
            explain: 'const 引用既避免复制，又向调用者和编译器承诺不修改对象。按值会复制；非 const 引用表达“可能修改”；裸指针还需要额外处理空指针。'
          }
        }
      ]
    },

    {
      id: 'ch5',
      title: '链表：用指针连接数据',
      cards: [
        {
          id: 'c5-array-list',
          title: '数组与链表：连续 vs 连接',
          lead: '数组靠连续存储和下标定位；链表靠每个节点里的 next 指针把分散的节点串起来。',
          tags: ['数组', '链表', '复杂度'],
          viz: 'list',
          lab: 'list',
          file: 'compare.c',
          focus: [1, 2, 3, 4],
          snippet: `
            int values[3] = {10, 20, 30};
            int x = values[1];       // 直接定位，快

            /* 链表：节点可以分散在内存中 */
            [10|next] -> [20|next] -> [30|NULL]
          `,
          content: `
            <p>数组将元素连续存放，可以通过下标访问：</p>
            ${cb('array.c', `
              int values[3] = {10, 20, 30};
              int x = values[1];   // 取出 20
            `, 'C')}
            <p>链表采用另一种组织方式：每个节点保存自己的数据，并保存下一个节点的地址。</p>
            ${outBlock([
              '头节点',
              '  ↓',
              '[10 | 下一个节点的地址] → [20 | 下一个节点的地址] → [30 | NULL]'
            ], '单向链表')}

            <div class="table-wrap">
              <table>
                <thead><tr><th>操作</th><th>数组</th><th>单向链表</th></tr></thead>
                <tbody>
                  <tr><td>按下标取元素</td><td>快，O(1)</td><td>需要从头逐个寻找，O(n)</td></tr>
                  <tr><td>已知位置后插入/删除</td><td>可能需要移动后续元素</td><td>修改指针，O(1)</td></tr>
                  <tr><td>额外存储</td><td>只有数据本身</td><td>每个节点还要保存 next 指针</td></tr>
                  <tr><td>内存布局</td><td>连续，对缓存友好</td><td>可以分散，缓存局部性较差</td></tr>
                </tbody>
              </table>
            </div>

            ${callout('note', '不是“链表更高级”', '链表适合频繁在已知位置调整连接、且不需要随机访问的场景；数组适合需要下标访问、遍历紧凑、内存受限的场景。选择取决于访问模式，而不是哪个听起来更“数据结构”。')}

            <p>观察上方可视化：节点之间不是靠地址连续，而是靠 <code>next</code> 指针连接。右侧实验台已经准备好了 <code>10 → 20 → 30</code> 的链表，先输入 <code>traverse</code> 看看遍历结果。</p>
          `,
          task: {
            prompt: '输入 <code>traverse</code>，从 head 开始遍历整条链表。',
            steps: [
              { label: '遍历链表', test: function (cmd) { return same(cmd, 'traverse'); } }
            ]
          }
        },
        {
          id: 'c5-node',
          title: '节点：结构体里保存指向自己的指针',
          lead: '一个 Node 里既有数据，也有“下一个 Node 在哪里”的地址；这是自引用结构。',
          tags: ['Node', 'next', 'nullptr'],
          viz: 'list',
          lab: 'list',
          file: 'node.c',
          focus: [1, 2, 3, 4, 5],
          snippet: `
            typedef struct Node {
                int value;
                struct Node *next;
            } Node;

            Node a = {10, NULL};
            Node b = {20, NULL};
            a.next = &b;
            Node *head = &a;
          `,
          content: `
            <p>用结构体定义节点：</p>
            ${cb('node.c', `
              #include <stddef.h>

              typedef struct Node {
                  int value;
                  struct Node *next;
              } Node;
            `, 'C')}
            <p><code>next</code> 是一个指针，指向下一个 <code>Node</code>。注意：节点里保存的是“下一个节点的地址”，不是“下一个节点本身”。如果保存节点本身，类型会无限嵌套，大小无法确定。</p>

            <h2>把三个节点连起来</h2>
            ${cb('link.c', `
              Node a = {10, NULL};
              Node b = {20, NULL};
              Node c = {30, NULL};

              a.next = &b;
              b.next = &c;

              Node *head = &a;
            `, 'C')}
            ${outBlock([
              'head → a[10] → b[20] → c[30] → NULL'
            ])}

            <h2>C 与 C++ 的写法差异</h2>
            <p>上面的代码在 C 中必须写 <code>struct Node *next</code>，因为 <code>Node</code> 这个 typedef 名字在结构体内部还不能使用。到了 C++，可以直接写：</p>
            ${cb('node.cpp', `
              struct Node {
                  int value;
                  Node* next;   // C++ 中可以直接使用 Node
              };

              Node a{10, nullptr};
              Node b{20, nullptr};
              a.next = &b;
              Node* head = &a;
            `)}
            <p>C++ 中用 <code>nullptr</code> 表示空指针，比 <code>NULL</code> 或 <code>0</code> 更明确，也更安全。</p>

            <h2>内存里发生了什么</h2>
            <p>每个节点都有两块内容：<code>value</code> 和一个指针 <code>next</code>。在 64 位平台上，指针通常是 8 字节；节点总大小还会受对齐影响。遍历时，程序先读 <code>current-&gt;next</code> 得到下一个地址，再跳到那里。</p>

            ${callout('tip', 'head 只是入口', '<code>head</code> 不是特殊节点，它只是一个保存首节点地址的指针。链表本身由节点和它们之间的连接组成；<code>head == nullptr</code> 就表示空链表。')}

            <p>输入 <code>head</code> 查看头节点的值，再输入 <code>status</code> 观察整条链的连接关系。</p>
          `,
          task: {
            prompt: '输入 <code>head</code> 查看头节点，再输入 <code>status</code> 查看整条链。',
            steps: [
              { label: '查看 head', test: function (cmd) { return same(cmd, 'head'); } },
              { label: '查看 status', test: function (cmd) { return same(cmd, 'status'); } }
            ]
          }
        },
        {
          id: 'c5-traverse',
          title: '遍历：从 head 走到 nullptr',
          lead: '遍历是链表所有操作的基础：用一个游标指针逐个前进，直到空指针为止。',
          tags: ['遍历', 'while', 'current'],
          viz: 'list',
          lab: 'list',
          file: 'traverse.c',
          focus: [3, 4, 5, 6, 7, 8],
          snippet: `
            Node *current = head;

            while (current != NULL) {
                printf("%d\\n", current->value);
                current = current->next;
            }
          `,
          content: `
            <p>从 <code>head</code> 开始遍历链表：</p>
            ${cb('traverse.c', `
              Node *current = head;

              while (current != NULL) {
                  printf("%d\\n", current->value);
                  current = current->next;
              }
            `, 'C')}
            ${outBlock(['10', '20', '30'], '遍历输出')}

            <h2>三个关键点</h2>
            <ol class="steps">
              <li><strong>用单独的游标。</strong>不要直接移动 <code>head</code>，否则会丢失链表入口。用 <code>current</code> 复制一份头指针。</li>
              <li><strong>先判断再访问。</strong><code>while (current != nullptr)</code> 保证进入循环时当前节点存在。</li>
              <li><strong>前进的是指针。</strong><code>current = current-&gt;next</code>，不是 <code>*current = *current-&gt;next</code>。后者会复制节点内容，完全不是遍历。</li>
            </ol>

            ${cb('empty.c', `
              Node *head = NULL;
              Node *current = head;

              while (current != NULL) {
                  // 空链表时一次也不会进入
              }
            `, 'C')}

            <h2>遍历能做什么</h2>
            <ul>
              <li>打印所有值；</li>
              <li>统计节点个数；</li>
              <li>查找某个值；</li>
              <li>计算总和、最大值；</li>
              <li>在遍历中定位插入/删除位置。</li>
            </ul>
            <p>这些操作的时间复杂度都是 O(n)，因为最坏情况下要走到尾部。</p>

            ${callout('warn', '死循环的常见原因', '如果某个节点的 <code>next</code> 指向了前面的节点，链表就形成了环，<code>while (current != nullptr)</code> 永远不结束。调试时可以先打印节点地址，确认没有重复地址。')}

            <p>输入 <code>traverse</code>，观察上方节点依次被标记为已访问；再输入 <code>find 20</code>，看看查找是如何复用遍历的。</p>
          `,
          task: {
            prompt: '输入 <code>traverse</code>，再输入 <code>find 20</code>，观察遍历与查找。',
            steps: [
              { label: '遍历全部节点', test: function (cmd) { return same(cmd, 'traverse'); } },
              { label: '查找 20', test: function (cmd) { return same(cmd, 'find 20'); } }
            ]
          }
        },
        {
          id: 'c5-insert-delete',
          title: '插入与删除：改的是 next，不是搬数据',
          lead: '链表调整连接只需要改几个指针，但顺序和边界条件必须非常小心。',
          tags: ['插入', '删除', '指针重连'],
          viz: 'list',
          lab: 'list',
          file: 'edit.c',
          focus: [1, 2, 3, 4, 5, 6],
          snippet: `
            /* 在 a 后面插入 new_node */
            new_node.next = a.next;
            a.next = &new_node;

            /* 删除 a 后面的节点 */
            a.next = new_node.next;
          `,
          content: `
            <p>假设要在 <code>a</code> 和 <code>b</code> 之间插入节点 <code>new_node</code>：</p>
            ${cb('insert.c', `
              Node new_node = {15, NULL};

              new_node.next = a.next;
              a.next = &new_node;
            `, 'C')}
            ${outBlock([
              '插入前：a → b → c',
              '插入后：a → new_node → b → c'
            ])}

            <h2>顺序不能反</h2>
            <p>如果先写 <code>a.next = &amp;new_node;</code>，那么原来的 <code>a.next</code> 就被覆盖了，再也找不到 <code>b</code>，链表在 <code>new_node</code> 处断掉。正确顺序是：</p>
            <ol class="steps">
              <li>先让新节点接上后方的链：<code>new_node.next = a.next;</code></li>
              <li>再让前驱节点指向新节点：<code>a.next = &amp;new_node;</code></li>
            </ol>

            <h2>删除</h2>
            ${cb('remove.c', `
              a.next = new_node.next;
            `, 'C')}
            <p>这句代码改变了链表的连接关系。它没有改变 <code>new_node</code> 变量本身，也没有释放内存。节点仍然存在，只是从这条链上“摘”了下来。</p>
            ${callout('warn', '摘除 ≠ 释放', '如果节点是用 <code>malloc</code>/<code>new</code> 动态分配的，摘除后还需要在合适的时候 <code>free</code>/<code>delete</code>，否则泄漏；如果还有其他指针指向它，释放后又访问就是悬空指针。所有权必须明确。')}

            <h2>边界情况</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th>场景</th><th>关键动作</th></tr></thead>
                <tbody>
                  <tr><td>在头部插入</td><td><code>new_node.next = head; head = &amp;new_node;</code></td></tr>
                  <tr><td>删除头节点</td><td><code>head = head-&gt;next;</code>（先保存旧 head 以便释放）</td></tr>
                  <tr><td>在尾部插入</td><td>先走到最后一个节点，再令其 <code>next</code> 指向新节点</td></tr>
                  <tr><td>空链表</td><td>插入时同时更新 <code>head</code>；删除时直接判断为空</td></tr>
                  <tr><td>找不到目标</td><td>不要修改任何连接，返回失败</td></tr>
                </tbody>
              </table>
            </div>

            ${callout('deep', '为什么链表插入是 O(1)？', '这里说的 O(1) 是“已经知道插入位置”的情况：只需改两个指针。但如果你只知道值、要先查找位置，那么查找本身是 O(n)，总成本仍是 O(n)。分析复杂度时不要把“定位”漏掉。')}

            <p>实验台里先用 <code>insertAfter 10 15</code> 在 10 后面插入 15，再用 <code>removeAfter 10</code> 摘除它，最后 <code>traverse</code> 验证链表的连接。</p>
          `,
          task: {
            prompt: '依次输入 <code>insertAfter 10 15</code>、<code>removeAfter 10</code>、<code>traverse</code>。',
            steps: [
              { label: '在 10 后插入 15', test: function (cmd) { return same(cmd, 'insertAfter 10 15'); } },
              { label: '摘除 10 后的节点', test: function (cmd) { return same(cmd, 'removeAfter 10'); } },
              { label: '再次遍历', test: function (cmd) { return same(cmd, 'traverse'); } }
            ]
          }
        },
        {
          id: 'c5-memory',
          title: '栈、堆与所有权：节点从哪里来',
          lead: '链表节点可以来自栈上的局部变量，也可以来自堆上的动态分配；两者的生命周期和释放责任完全不同。',
          tags: ['栈', '堆', 'malloc', 'new'],
          viz: 'list',
          lab: 'list',
          file: 'memory.c',
          focus: [1, 2, 3, 4, 5],
          snippet: `
            Node a = {10, NULL};          // 栈：随作用域结束而销毁
            Node *p = malloc(sizeof(Node)); // 堆：需要手动 free
            p->value = 20;
            p->next = NULL;

            free(p);                       // 否则泄漏
          `,
          content: `
            <p>前面的例子中，节点都是已有变量：</p>
            ${cb('stack.c', `
              Node a = {10, NULL};
              Node b = {20, NULL};
              a.next = &b;
            `, 'C')}
            <p>这些节点在栈上，生命周期由作用域决定。函数返回后，局部节点被销毁，指向它们的指针就会悬空。因此，不能把一个局部节点的地址返回给调用者。</p>

            <h2>动态创建节点</h2>
            ${cb('heap.c', `
              #include <stdlib.h>

              Node *p = (Node *)malloc(sizeof(Node));
              if (p == NULL) {
                  /* 分配失败，必须处理 */
                  return -1;
              }

              p->value = 20;
              p->next = NULL;

              /* 使用完 */
              free(p);
              p = NULL;
            `, 'C')}
            ${cb('heap.cpp', `
              Node* p = new Node{20, nullptr};

              // 使用 p ...

              delete p;
              p = nullptr;
            `)}
            <p><code>malloc</code>/<code>free</code> 和 <code>new</code>/<code>delete</code> 都从堆上申请/归还内存，但语义不同：<code>new</code> 会调用构造函数，失败时默认抛出异常；<code>malloc</code> 只分配原始字节，失败返回空指针。不要把 <code>malloc</code> 和 <code>delete</code> 混用。</p>

            <h2>三种常见事故</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th>问题</th><th>发生了什么</th><th>如何避免</th></tr></thead>
                <tbody>
                  <tr><td>内存泄漏</td><td>分配后忘记 <code>free</code>/<code>delete</code></td><td>明确所有者；成对编写分配/释放</td></tr>
                  <tr><td>重复释放</td><td>两个指针指向同一块内存，都去释放</td><td>所有权唯一；释放后置空</td></tr>
                  <tr><td>释放后使用</td><td>节点已释放，仍通过旧指针访问</td><td>理清生命周期；必要时用智能指针</td></tr>
                </tbody>
              </table>
            </div>

            ${callout('note', '嵌入式项目的常见选择', '文档提到：很多嵌入式项目会使用预先分配好的节点，或直接使用数组。这样可以避免运行时分配失败、内存碎片和不确定的分配延迟。链表不一定意味着每次插入都要 malloc；也可以从静态节点池中取节点。')}

            <h2>谁负责释放？</h2>
            <p>链表的所有权通常属于“拥有 head 的那个对象/模块”。如果是一个 <code>List</code> 类，它应在析构时遍历并释放所有节点；如果链表只是借用外部节点，就绝不能擅自释放。这个约定必须在接口注释和设计文档里写清楚。</p>

            <p>本实验台中的节点是模拟对象，不会真的分配堆内存；但 <code>removeAfter</code> 会保留“已摘除”的节点，提醒你：从链上摘除不等于释放。</p>
          `,
          quiz: {
            q: '用 malloc 创建链表节点后，从链表中摘除该节点，最需要注意什么？',
            options: [
              '摘除后节点会自动释放',
              '只要把 next 置空就不会泄漏',
              '摘除只改变连接，仍需在合适时机 free，并避免继续使用悬空指针',
              '必须立刻把整个链表 free 掉'
            ],
            answer: 2,
            explain: '摘除只是修改前驱的 next，节点内存仍然存在。动态分配的节点需要明确的所有者负责 free；释放后旧指针不能再用。'
          }
        }
      ]
    },

    {
      id: 'ch6',
      title: '滑动窗口滤波：让数据平稳',
      cards: [
        {
          id: 'c6-idea',
          title: '传感器抖动与滑动窗口',
          lead: '连续读数有小幅波动时，取最近几次的平均值，能让输出更平稳，但也会带来延迟。',
          tags: ['滑动平均', '滤波', '窗口'],
          viz: 'filter',
          lab: 'filter',
          file: 'idea.txt',
          focus: [1, 2, 3],
          snippet: `
            读数：100、101、99、102、100

            窗口大小 4：
            收到 10,20,30,40 → 窗口 [10,20,30,40] → 平均 25
            再收到 50       → 窗口 [20,30,40,50] → 平均 35
          `,
          staticOutput: [
            '窗口：[100, 101, 99, 102]',
            '平均值：(100+101+99+102)/4 = 100',
            '输出更平稳，但对突变反应更慢。'
          ],
          content: `
            <p>假设一个距离传感器连续返回：</p>
            ${outBlock(['100、101、99、102、100'], '原始读数')}
            <p>读数有少量波动。我们可以取最近几次读数的平均值，让输出更平稳。这称为<strong>滑动窗口平均滤波</strong>。</p>

            <h2>窗口如何滑动</h2>
            <p>假设窗口大小为 4：</p>
            ${outBlock([
              '收到：10、20、30、40',
              '窗口：[10, 20, 30, 40]',
              '平均值：25',
              '',
              '再收到：50',
              '窗口：[20, 30, 40, 50]',
              '平均值：35'
            ])}
            <p>每来一个新值，就移走最旧的值。这里的“窗口”始终跟着最新数据向前滑动。</p>

            <h2>为什么叫“滤波”</h2>
            <p>滑动平均是一种低通滤波：它让缓慢变化的趋势通过，削弱快速抖动。代价是<strong>相位滞后</strong>——输出反映的是过去一段时间的数据，而不是此刻的瞬时值。</p>

            <div class="table-wrap">
              <table>
                <thead><tr><th>窗口大小</th><th>平滑程度</th><th>对突变的反应</th><th>滞后</th></tr></thead>
                <tbody>
                  <tr><td>小（如 2～4）</td><td>较弱</td><td>较快</td><td>较小</td></tr>
                  <tr><td>大（如 16～64）</td><td>较强</td><td>较慢</td><td>较大</td></tr>
                </tbody>
              </table>
            </div>

            ${callout('note', '先把问题说清楚', '滑动平均适合抑制随机噪声，不适合消除尖峰异常值（那更适合中值滤波），也不能替代传感器量程和有效性检查。工程上要先明确噪声来源和可接受的延迟。')}

            <p>右侧实验台已经准备好一个窗口大小为 4 的滤波器。输入 <code>push 100</code>，观察窗口如何从空开始逐步填充，以及平均值如何计算。</p>
          `,
          task: {
            prompt: '输入 <code>push 100</code>，放入第一个采样并观察窗口。',
            steps: [
              { label: '放入 100', test: function (cmd) { return same(cmd, 'push 100'); } }
            ]
          }
        },
        {
          id: 'c6-ring',
          title: '环形缓冲：让窗口自己转起来',
          lead: '用固定长度数组 + 一个循环下标，就能在不搬动数据的情况下维护最近 W 个样本。',
          tags: ['环形缓冲', 'index', 'sum'],
          viz: 'filter',
          lab: 'filter',
          file: 'ring.txt',
          focus: [1, 2, 3, 4, 5],
          snippet: `
            samples[index] = new_value;   // 覆盖最旧的位置
            index = (index + 1) % WINDOW_SIZE;

            窗口已满时：
            sum -= 被覆盖的旧值;
            sum += new_value;
          `,
          staticOutput: [
            'index: 0 → 1 → 2 → 3 → 0 → …',
            '窗口满后，每次覆盖 index 指向的最旧元素。',
            'sum 增量更新：旧和 - 旧值 + 新值。'
          ],
          content: `
            <p>最直接的做法是用长度为 4 的数组保存最近 4 个值；每次收到新值，都重新把数组加一遍。窗口很小时，这样写完全可行。如果窗口较大、采样很频繁，可以进一步优化：保存当前总和，更新时减去旧值、加上新值。</p>

            ${outBlock([
              '新总和 = 旧总和 - 被移走的值 + 新值'
            ], '增量更新')}

            <h2>循环下标</h2>
            <p>数组下标走到末尾后回到开头，因此它也使用了循环存储的思路：</p>
            ${cb('ring.txt', `
              samples[index] = new_value;

              index++;
              if (index == WINDOW_SIZE) {
                  index = 0;
              }
            `, '伪代码')}
            <p><code>index</code> 始终指向“下一次要覆盖的位置”。当窗口还没满时，它就是下一个空位；当窗口满了以后，它指向窗口里最旧的元素。</p>

            ${outBlock([
              '初始：index = 0, count = 0, sum = 0',
              'push 10 → samples[0]=10, index=1, count=1, sum=10',
              'push 20 → samples[1]=20, index=2, count=2, sum=30',
              'push 30 → samples[2]=30, index=3, count=3, sum=60',
              'push 40 → samples[3]=40, index=0, count=4, sum=100',
              'push 50 → 覆盖 samples[0]（旧值 10），index=1, sum=140'
            ], '窗口演化')}

            <h2>为什么用 count 而不是直接用 index 判断满没满</h2>
            <p><code>index</code> 只表示下一次写哪里，不能单独说明已经收到了几个有效样本。窗口没满时，数组里可能有未初始化的位置；用 <code>count</code> 记录有效样本数，求平均时除以 <code>count</code>，就自然处理了“预热阶段”。</p>

            ${callout('warn', '先减旧值，再覆盖', '窗口满时，必须在覆盖 <code>samples[index]</code> 之前把旧值从 <code>sum</code> 中减掉，否则会减掉新值，或者永远少减一次。顺序是：如果已满 → 减旧值；否则 count++ → 写入新值 → 加新值 → index 前进。')}

            <p>输入四个采样 <code>push 100</code>、<code>push 101</code>、<code>push 99</code>、<code>push 102</code>，把窗口填满，观察 <code>index</code> 从 3 绕回 0。再输入第五个值，观察它覆盖的是哪一个格子。</p>
          `,
          task: {
            prompt: '依次输入 <code>push 100</code>、<code>push 101</code>、<code>push 99</code>、<code>push 102</code>，填满窗口。',
            steps: [
              { label: 'push 100', test: function (cmd) { return same(cmd, 'push 100'); } },
              { label: 'push 101', test: function (cmd) { return same(cmd, 'push 101'); } },
              { label: 'push 99', test: function (cmd) { return same(cmd, 'push 99'); } },
              { label: 'push 102', test: function (cmd) { return same(cmd, 'push 102'); } }
            ]
          }
        },
        {
          id: 'c6-code',
          title: '逐行读懂 C 实现',
          lead: '把结构体字段、初始化、更新和返回值拆开看，这段几十行的代码就是滑动平均的完整核心。',
          tags: ['C 实现', '逐行解析'],
          viz: 'filter',
          lab: 'filter',
          file: 'filter.c',
          focus: [6, 7, 8, 9, 10, 11],
          snippet: `
            typedef struct {
                uint16_t samples[WINDOW_SIZE];
                uint32_t sum;
                uint8_t index;
                uint8_t count;
            } MovingAverage;

            uint16_t moving_average_update(
                MovingAverage *filter, uint16_t new_value);
          `,
          content: `
            <p>下面用 C 实现。数组下标走到末尾后回到开头，因此它使用了循环存储的思路。</p>

            ${cb('filter.c', `
              #include <stdint.h>

              #define WINDOW_SIZE 4

              typedef struct {
                  uint16_t samples[WINDOW_SIZE];  // 窗口内的数据
                  uint32_t sum;                   // 窗口和
                  uint8_t index;                  // 当前指向
                  uint8_t count;                  // 窗口内有效数字数目
              } MovingAverage;

              void moving_average_init(MovingAverage *filter)
              {
                  filter->sum = 0;
                  filter->index = 0;
                  filter->count = 0;

                  for (uint8_t i = 0; i < WINDOW_SIZE; i++) {
                      filter->samples[i] = 0;
                  }
              }

              uint16_t moving_average_update(MovingAverage *filter, uint16_t new_value)
              {
                  if (filter->count == WINDOW_SIZE) {
                      // 窗口已满，先移走即将被覆盖的旧值
                      filter->sum -= filter->samples[filter->index];
                  } else {
                      filter->count++;
                  }

                  filter->samples[filter->index] = new_value;
                  filter->sum += new_value;

                  filter->index++;
                  if (filter->index == WINDOW_SIZE) {
                      filter->index = 0;
                  }

                  return (uint16_t)(filter->sum / filter->count);
              }
            `)}

            <h2>逐段解释</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th>代码</th><th>作用</th></tr></thead>
                <tbody>
                  <tr><td><code>samples[WINDOW_SIZE]</code></td><td>保存窗口里的数，长度固定为 4</td></tr>
                  <tr><td><code>sum</code></td><td>当前窗口总和；用比单个采样更宽的类型防止相加溢出</td></tr>
                  <tr><td><code>index</code></td><td>下一次覆盖哪个位置</td></tr>
                  <tr><td><code>count</code></td><td>窗口内有效样本数，处理预热阶段</td></tr>
                  <tr><td><code>if (count == WINDOW_SIZE)</code></td><td>窗口已满时，先减去即将被覆盖的旧值</td></tr>
                  <tr><td><code>samples[index] = new_value</code></td><td>写入新值，可能覆盖最旧值</td></tr>
                  <tr><td><code>index = 0</code></td><td>下标走到末尾后绕回开头</td></tr>
                  <tr><td><code>sum / count</code></td><td>整数除法，结果向零截断</td></tr>
                </tbody>
              </table>
            </div>

            <h2>使用方法</h2>
            ${cb('main.c', `
              #include <stdio.h>

              int main(void)
              {
                  MovingAverage distance_filter;

                  moving_average_init(&distance_filter);

                  uint16_t filtered =
                      moving_average_update(&distance_filter, 100);
                  filtered = moving_average_update(&distance_filter, 102);

                  printf("%u\\n", filtered);
                  return 0;
              }
            `, 'C')}

            ${callout('warn', '整数除法会截断', '例如 <code>(100 + 101 + 99 + 102) / 4 = 100</code>，如果和不能被 4 整除，小数部分被丢掉。若需要四舍五入，可以在除之前加上 <code>count / 2</code>，但要先确认数值范围不会溢出。')}

            <h2>类型选择</h2>
            <p><code>uint16_t</code> 能表示 0～65535，<code>uint32_t</code> 能表示 0～4294967295。窗口大小为 4 时，4 × 65535 = 262140，<code>uint32_t</code> 足够。真实项目仍要根据窗口大小和输入上限计算最大可能和，不能凭感觉选类型。</p>

            <p>输入 <code>demo</code>，让实验台连续放入一组传感器读数，观察每一步的平均值和窗口变化；也可以输入 <code>status</code> 查看内部状态。</p>
          `,
          task: {
            prompt: '输入 <code>demo</code>，连续观察 100、101、99、102、100 的滤波结果。',
            steps: [
              { label: '运行演示', test: function (cmd) { return same(cmd, 'demo'); } }
            ]
          }
        },
        {
          id: 'c6-tradeoff',
          title: '工程取舍与边界',
          lead: '窗口越大越平滑，但响应越慢；滤波器的正确性还取决于类型、预热、异常值和测试。',
          tags: ['取舍', '溢出', '工程细节'],
          viz: 'filter',
          lab: 'filter',
          file: 'tradeoff.txt',
          focus: [1, 2, 3, 4],
          snippet: `
            窗口大小 ↑   → 平滑 ↑，滞后 ↑
            窗口大小 ↓   → 平滑 ↓，响应 ↑

            最大和 = WINDOW_SIZE × 单样本最大值
            sum 的类型必须能容纳它。
          `,
          content: `
            <p>滑动平均的效果不是“越大越好”。窗口大小本质上是在<strong>平滑度</strong>和<strong>响应速度</strong>之间做取舍。</p>

            ${outBlock([
              '窗口小：输出紧跟输入，但抖动仍明显',
              '窗口中：折中',
              '窗口大：输出平滑，但对真实变化反应慢'
            ], '取舍')}

            <h2>必须检查的边界</h2>
            <ol class="steps">
              <li><strong>整数溢出。</strong>先算 <code>WINDOW_SIZE × 单样本最大值</code>，确认 <code>sum</code> 的类型放得下。如果窗口是 64、样本上限 65535，和最大为 4,194,240，仍可用 <code>uint32_t</code>；再大就需要 64 位。</li>
              <li><strong>预热阶段。</strong>前几个样本没有填满窗口，应该除以实际 <code>count</code>，而不是固定除以窗口大小。</li>
              <li><strong>无效读数。</strong>传感器断线、超量程、返回 0 或 65535 时，是否应该计入窗口？通常要先做有效性判断，不能把错误值当成正常数据平滑。</li>
              <li><strong>异常尖峰。</strong>平均值会被极端值拉偏。如果尖峰是错误数据，考虑中值滤波或先做范围检查；如果尖峰是真实变化，平均会把它延迟。</li>
              <li><strong>除法截断。</strong>确认业务能否接受向下截断；需要四舍五入时，注意加 <code>count/2</code> 仍可能溢出。</li>
            </ol>

            <h2>复杂度</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th>实现</th><th>每次更新</th><th>额外空间</th><th>适用</th></tr></thead>
                <tbody>
                  <tr><td>每次重新求和</td><td>O(W)</td><td>O(W)</td><td>窗口很小、代码简单优先</td></tr>
                  <tr><td>增量维护 sum</td><td>O(1)</td><td>O(W)</td><td>窗口较大、采样频繁</td></tr>
                </tbody>
              </table>
            </div>

            ${callout('tip', '先写对，再写快', '窗口只有 4 个元素时，重新求和与增量更新的差距微乎其微。先保证预热、覆盖顺序和类型正确，再用测量结果决定是否优化。')}

            <p>实验台允许你输入很大的值，观察平均值的变化。试试 <code>push 65000</code>，再想想：如果窗口是 64，<code>sum</code> 仍然用 <code>uint32_t</code> 够不够？</p>
          `,
          quiz: {
            q: '窗口大小为 4，单样本最大 65535，sum 使用 uint32_t。下面哪个说法最准确？',
            options: [
              '一定不会溢出，因为 uint32_t 很大',
              '4 × 65535 = 262140，uint32_t 足够容纳这个最大和',
              '必须使用 uint16_t，否则浪费空间',
              '只要平均值不超过 65535，sum 就不会溢出'
            ],
            answer: 1,
            explain: '要按最大可能和判断：4 × 65535 = 262140，小于 uint32_t 的上限。平均值不溢出并不代表中间的和不溢出；类型选择要看最坏情况。'
          }
        }
      ]
    },

    {
      id: 'ch7',
      title: '综合应用与复习',
      cards: [
        {
          id: 'c7-project',
          title: '综合项目：带滤波的电机控制',
          lead: '把 Motor、滑动窗口和一条命令历史串起来：采样 → 滤波 → 限幅 → 执行，每一步都有明确责任。',
          tags: ['综合', '设计', '组合'],
          viz: 'project',
          lab: 'project',
          file: 'filtered_motor.cpp',
          focus: [1, 2, 3, 4, 5, 6, 7, 8],
          snippet: `
            class MotorController {
            public:
                bool update(uint16_t raw) {
                    uint16_t smoothed = filter_.update(raw);
                    return motor_.setSpeed(smoothed);
                }
            private:
                Motor motor_{1};
                SpeedFilter filter_;
            };
          `,
          content: `
            <p>现在把两条线合在一起：</p>
            <ul>
              <li><strong>类</strong>负责守住电机速度的 0～100 不变量；</li>
              <li><strong>滑动窗口</strong>负责把原始速度指令变得平稳；</li>
              <li><strong>链表</strong>可以用来记录命令历史，但必须明确所有权和释放责任。</li>
            </ul>

            <h2>先拆责任</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th>组件</th><th>职责</th><th>不变量</th></tr></thead>
                <tbody>
                  <tr><td><code>SpeedFilter</code></td><td>维护最近 4 个原始值，返回平均值</td><td><code>count ≤ 4</code>，<code>sum</code> 不溢出</td></tr>
                  <tr><td><code>Motor</code></td><td>保存编号、速度、使能状态</td><td><code>0 ≤ speed_ ≤ 100</code></td></tr>
                  <tr><td><code>MotorController</code></td><td>组合前两者，处理一次更新</td><td>无效输入不改变电机状态</td></tr>
                </tbody>
              </table>
            </div>

            <h2>核心代码</h2>
            ${cb('speed_filter.h', `
              #include <cstdint>

              class SpeedFilter {
              public:
                  uint16_t update(uint16_t value)
                  {
                      if (count_ == kWindowSize) {
                          sum_ -= samples_[index_];
                      } else {
                          ++count_;
                      }

                      samples_[index_] = value;
                      sum_ += value;

                      index_ = (index_ + 1) % kWindowSize;
                      return static_cast<uint16_t>(sum_ / count_);
                  }

              private:
                  static constexpr int kWindowSize = 4;
                  uint16_t samples_[kWindowSize] = {};
                  uint32_t sum_ = 0;
                  uint8_t index_ = 0;
                  uint8_t count_ = 0;
              };
            `)}

            ${cb('filtered_motor.cpp', `
              class MotorController {
              public:
                  bool update(uint16_t rawSpeed)
                  {
                      uint16_t smoothed = filter_.update(rawSpeed);
                      return motor_.setSpeed(smoothed);
                  }

                  const Motor& motor() const { return motor_; }

              private:
                  Motor motor_{1};
                  SpeedFilter filter_;
              };
            `)}

            <p>调用：</p>
            ${cb('main.cpp', `
              #include <cstdio>

              int main()
              {
                  MotorController controller;

                  const uint16_t readings[] = {80, 90, 85, 95, 88};
                  for (uint16_t raw : readings) {
                      bool ok = controller.update(raw);
                      std::printf("raw=%u, speed=%d, ok=%d\\n",
                                  raw,
                                  controller.motor().speed(),
                                  ok ? 1 : 0);
                  }
                  return 0;
              }
            `)}

            <h2>为什么需要一个 Controller</h2>
            <p>如果没有 <code>MotorController</code>，调用者要自己记得“先滤波、再限幅、再设置速度”，顺序很容易写错。Controller 把这段流程封装成一个操作，暴露稳定的 <code>update()</code> 接口，内部组件仍然是独立、可测试的。</p>

            ${callout('warn', '滤波后的值仍可能非法', '滤波不会自动保证结果落在 0～100 内。例如原始值包含 150，平均值可能是 120。最终仍要由 <code>Motor::setSpeed()</code> 做范围检查。每一层都必须守住自己的职责。')}

            <h2>命令历史链表（可选）</h2>
            <p>如果要记录每次更新，可以增加一条链表：</p>
            ${cb('command_log.cpp', `
              struct Command {
                  uint16_t raw;
                  uint16_t applied;
                  Command* next;
              };

              class CommandLog {
              public:
                  ~CommandLog() {
                      while (head_ != nullptr) {
                          Command* next = head_->next;
                          delete head_;
                          head_ = next;
                      }
                  }

                  void push(uint16_t raw, uint16_t applied) {
                      head_ = new Command{raw, applied, head_};
                  }

              private:
                  Command* head_ = nullptr;
              };
            `)}
            <p>这里必须写析构函数释放所有节点，否则每次 <code>new</code> 都会泄漏。这个例子也说明：链表并不只是“插入删除很酷”，一旦涉及堆内存，所有权和生命周期就是设计的一部分。</p>

            ${callout('warn', '拥有资源的类还要处理“复制”', '上面的 <code>CommandLog</code> 默认允许拷贝；两个对象会共享同一个 <code>head_</code>，析构时可能重复 <code>delete</code>。真实代码应禁用拷贝，或实现深拷贝并遵守“三法则/五法则”。本课不展开，但看到“裸指针 + 析构函数”时一定要想到这个问题。')}

            <p>实验台把“采样 → 滤波 → 限幅”做成了可视化流程。输入 <code>update 80</code>，再输入 <code>update 90</code>，观察窗口平均值如何决定最终电机速度。</p>
          `,
          task: {
            prompt: '依次输入 <code>update 80</code>、<code>update 90</code>、<code>status</code>，观察完整流水线。',
            steps: [
              { label: 'update 80', test: function (cmd) { return same(cmd, 'update 80'); } },
              { label: 'update 90', test: function (cmd) { return same(cmd, 'update 90'); } },
              { label: '查看流水线状态', test: function (cmd) { return same(cmd, 'status'); } }
            ]
          }
        },
        {
          id: 'c7-testing',
          title: '测试：把边界情况变成用例',
          lead: '类、链表、滤波器都应该在“正常值之外”被测试：空、满、越界、找不到、溢出。',
          tags: ['测试', '边界', 'assert'],
          viz: 'project',
          lab: 'project',
          file: 'test.cpp',
          focus: [1, 2, 3, 4, 5, 6, 7],
          snippet: `
            Motor m(1);
            assert(m.setSpeed(0) == true);
            assert(m.setSpeed(-1) == false);
            assert(m.speed() == 0);

            // 测试的是行为，不是实现细节
          `,
          content: `
            <p>能运行不等于正确。下面这些用例，比“随便输入 80 看看”更能暴露问题。</p>

            <h2>Motor</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th>输入/操作</th><th>期望</th><th>检查点</th></tr></thead>
                <tbody>
                  <tr><td><code>setSpeed(-1)</code></td><td>返回 false，速度不变</td><td>下界</td></tr>
                  <tr><td><code>setSpeed(0)</code></td><td>返回 true，速度为 0</td><td>合法下界</td></tr>
                  <tr><td><code>setSpeed(100)</code></td><td>返回 true，速度为 100</td><td>合法上界</td></tr>
                  <tr><td><code>setSpeed(101)</code></td><td>返回 false，速度不变</td><td>上界外</td></tr>
                  <tr><td><code>const Motor cm(2); cm.setSpeed(50)</code></td><td>编译失败</td><td>const 正确性</td></tr>
                </tbody>
              </table>
            </div>

            ${cb('test_motor.cpp', `
              #include <cassert>

              void test_motor()
              {
                  Motor m(1);

                  assert(m.setSpeed(0) == true);
                  assert(m.speed() == 0);

                  assert(m.setSpeed(-1) == false);
                  assert(m.speed() == 0);

                  assert(m.setSpeed(100) == true);
                  assert(m.speed() == 100);

                  assert(m.setSpeed(101) == false);
                  assert(m.speed() == 100);
              }
            `)}

            <h2>链表</h2>
            <ul>
              <li>空链表遍历：不崩溃，输出为空。</li>
              <li>只有一个节点：遍历一次后结束。</li>
              <li>头部插入/删除：<code>head</code> 正确更新。</li>
              <li>尾部插入：前驱的 <code>next</code> 指向新节点，新节点的 <code>next</code> 为 <code>nullptr</code>。</li>
              <li>删除不存在的值：链表保持不变。</li>
              <li>删除后再次遍历：不会访问已摘除的节点。</li>
            </ul>

            <h2>滑动窗口</h2>
            <ul>
              <li>窗口未满时，平均值除以实际 <code>count</code>。</li>
              <li>窗口刚好填满时，<code>count == 4</code>。</li>
              <li>第五个值覆盖最旧值，<code>sum</code> 正确。</li>
              <li>下标从 3 绕回 0。</li>
              <li>最大输入下，<code>sum</code> 不溢出。</li>
              <li><code>count</code> 为 0 时不会执行除法（第一次 update 之前不要调用平均）。</li>
            </ul>

            ${callout('tip', '测试行为，不测试实现', '断言应该检查“速度没有被修改”“遍历顺序正确”“平均值符合预期”，而不是检查私有成员或依赖某个特定的内存地址。这样重构实现时，测试仍然有意义。')}

            ${callout('warn', 'assert 不是生产环境的错误处理', '<code>assert</code> 通常只在调试构建中生效；发布版本可能被关闭。真正的错误处理要用返回值、异常或错误码，并把失败路径也纳入测试。')}

            <p>如果条件允许，打开编译器的警告并运行静态分析：<code>-Wall -Wextra -Wpedantic</code>，很多边界问题在运行前就会被指出来。</p>
          `,
          quiz: {
            q: '下面哪个测试用例最能暴露 Motor::setSpeed 的上界错误？',
            options: [
              'setSpeed(50) 返回 true',
              'setSpeed(100) 返回 true 且速度变为 100',
              'setSpeed(101) 必须返回 false 且速度保持原值',
              '创建一个 Motor 对象不崩溃'
            ],
            answer: 2,
            explain: '只测试合法值无法发现“忘记检查上界”的 bug。101 是紧邻合法上界的非法值，能直接验证边界条件和失败时状态不变。'
          }
        },
        {
          id: 'c7-cheatsheet',
          title: '速查表与下一步',
          lead: '把类、const、指针、链表和滑动窗口压缩成一张可复习的清单，再决定接下来学什么。',
          tags: ['速查', '复习', '路线'],
          viz: 'project',
          lab: 'project',
          file: 'cheatsheet.md',
          focus: [1, 2, 3, 4, 5, 6],
          snippet: `
            class  → 默认 private  → 维护不变量
            struct → 默认 public   → 简单数据集合
            const  → 只读承诺     → const 对象只能调 const 成员
            ->     → 指针访问     → p->member
            next   → 连接节点     → 改连接 ≠ 释放内存
            sum    → 增量维护     → 先减旧值，再加新值
          `,
          content: `
            <h2>一页速查</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th>主题</th><th>必须记住</th></tr></thead>
                <tbody>
                  <tr><td>类与对象</td><td>类是定义，对象是实例；每个对象有自己的数据成员</td></tr>
                  <tr><td>访问控制</td><td><code>class</code> 默认 private，<code>struct</code> 默认 public；建议显式写出</td></tr>
                  <tr><td>封装</td><td>公开操作、隐藏数据；修改入口集中，才能守住不变量</td></tr>
                  <tr><td>构造函数</td><td>与类同名、无返回类型；初始化列表按声明顺序执行</td></tr>
                  <tr><td>const 成员函数</td><td>承诺不修改对象；const 对象只能调用 const 成员函数</td></tr>
                  <tr><td>指针访问</td><td>对象用 <code>.</code>，指针用 <code>-&gt;</code>；空指针不能解引用</td></tr>
                  <tr><td>引用</td><td>必须初始化、不能换绑、不能为空；<code>const T&amp;</code> 用于只读大对象</td></tr>
                  <tr><td>链表</td><td>节点 = 数据 + next；遍历用游标；改 next 改变连接</td></tr>
                  <tr><td>插入顺序</td><td>先让新节点接上后继，再让前驱指向新节点</td></tr>
                  <tr><td>删除</td><td>摘除只改连接；动态节点仍需释放，释放后指针置空</td></tr>
                  <tr><td>滑动窗口</td><td>固定数组 + index 循环 + count 预热 + sum 增量</td></tr>
                  <tr><td>类型安全</td><td><code>sum</code> 要容纳窗口最大和；整数除法会截断</td></tr>
                </tbody>
              </table>
            </div>

            <h2>常见编译/运行错误对照</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th>现象</th><th>可能原因</th><th>检查</th></tr></thead>
                <tbody>
                  <tr><td><code>'speed_' is a private member</code></td><td>类外直接访问私有成员</td><td>改用公开成员函数</td></tr>
                  <tr><td><code>'this' argument ... not marked const</code></td><td>const 对象调用了非 const 成员函数</td><td>给只读函数加 <code>const</code></td></tr>
                  <tr><td><code>member reference type 'Motor *' ... did you mean '->'?</code></td><td>对指针用了 <code>.</code></td><td>改为 <code>-&gt;</code></td></tr>
                  <tr><td>程序崩溃在 <code>p-&gt;...</code></td><td>空指针或悬空指针</td><td>检查生命周期与空值</td></tr>
                  <tr><td>遍历死循环</td><td>链表成环或 <code>next</code> 自指</td><td>打印节点地址，检查连接</td></tr>
                  <tr><td>平均值偏大/偏小</td><td><code>sum</code> 没减旧值、覆盖顺序错误</td><td>按更新步骤逐行核对</td></tr>
                  <tr><td>平均值突然异常</td><td>整数溢出或无效读数进入窗口</td><td>检查类型上限与输入校验</td></tr>
                </tbody>
              </table>
            </div>

            <h2>下一步学什么</h2>
            <p>文档特意没有展开引用、函数重载、继承、多态、运算符重载和模板。现在你已经有了类、对象、const 和链表的基础，可以按这个顺序继续：</p>
            <ol class="steps">
              <li><strong>RAII 与析构函数：</strong>让对象自动管理资源，理解“谁拥有、谁释放”。</li>
              <li><strong>智能指针：</strong><code>std::unique_ptr</code>、<code>std::shared_ptr</code>，减少裸指针所有权错误。</li>
              <li><strong>STL 容器：</strong><code>std::vector</code>、<code>std::array</code>，先掌握比手写链表更常用的工具。</li>
              <li><strong>函数重载与运算符重载：</strong>理解接口设计，而不是只记语法。</li>
              <li><strong>继承与多态：</strong>在确实需要运行时多态时使用，避免为了“面向对象”而继承。</li>
              <li><strong>模板与泛型：</strong>写出可复用的容器和算法。</li>
              <li><strong>调试与测试：</strong>断言、单元测试、 sanitizer（地址/未定义行为检测）。</li>
            </ol>

            ${callout('tip', '学习建议', '每学一个语法点，都回到三个问题：<strong>它保护了什么不变量？它的生命周期是什么？失败时会发生什么？</strong> 这比背语法更能把 C++ 用对。')}

            <p>这一节没有新的命令任务。读完后点击任务栏的“标记已读”，然后进入结课测验。</p>
          `,
          task: null
        },
        {
          id: 'c7-final',
          title: '结课测验',
          lead: '六道题覆盖类、封装、构造、const、链表和滑动窗口。全部答对即完成课程。',
          tags: ['测验', '综合'],
          viz: 'project',
          lab: 'project',
          file: 'final_quiz.txt',
          focus: [1, 2, 3],
          snippet: `
            1. class 与 struct 的默认访问权限？
            2. const 成员函数承诺了什么？
            3. 链表删除节点后，内存是否自动释放？
            4. 滑动窗口的 index 指向哪里？
          `,
          content: `
            <p>下面六道题没有时间限制，可以回到前面的章节查阅。每题选择后都会立即给出解释。</p>
          `,
          quiz: {
            questions: [
              {
                q: '1. 在 C++ 中，下面关于 class 与 struct 的说法哪项正确？',
                options: [
                  'class 默认 public，struct 默认 private',
                  'class 默认 private，struct 默认 public',
                  'struct 不能有构造函数',
                  'class 不能有 public 数据成员'
                ],
                answer: 1,
                explain: '核心语法差别是默认访问权限：class 默认 private，struct 默认 public。两者都可以有构造函数、成员函数和任意访问限定符。'
              },
              {
                q: '2. 成员函数后面的 const 表示什么？',
                options: [
                  '这个函数返回 const 值',
                  '这个函数不能修改对象的普通成员状态',
                  '这个函数只能被 const 指针调用',
                  '这个函数一定是静态函数'
                ],
                answer: 1,
                explain: 'const 成员函数承诺不修改对象的普通成员，因此可以被 const 对象调用。它和返回值是否为 const 是两件不同的事。'
              },
              {
                q: '3. 一个 const Motor 对象可以调用下面哪个成员函数？',
                options: [
                  'void enable()',
                  'bool setSpeed(int)',
                  'int speed() const',
                  '任何 public 成员函数'
                ],
                answer: 2,
                explain: 'const 对象只能调用 const 成员函数。speed() 带有 const 承诺，所以可以；enable() 和 setSpeed() 会修改状态，因此不行。'
              },
              {
                q: '4. 在 a 和 b 之间插入 new_node，正确的指针操作顺序是？',
                options: [
                  'a.next = &new_node; new_node.next = a.next;',
                  'new_node.next = a.next; a.next = &new_node;',
                  'new_node.next = &a; a.next = &new_node;',
                  '先 free(a.next)，再让 a.next 指向 new_node'
                ],
                answer: 1,
                explain: '必须先把新节点接到后继链上，再让前驱指向新节点。顺序反过来会覆盖 a.next，导致后面的链表丢失。'
              },
              {
                q: '5. 用 malloc 创建的节点从链表中摘除后，下面哪项最准确？',
                options: [
                  '节点内存会自动释放',
                  '只要把节点的 next 置空，就不会泄漏',
                  '摘除只改变连接，仍需在合适时机 free，并避免悬空指针',
                  '必须立即释放整条链表'
                ],
                answer: 2,
                explain: '摘除只修改前驱的 next，不释放内存。动态节点需要明确的所有者负责 free；释放后旧指针不能继续使用。'
              },
              {
                q: '6. 窗口已满时，滑动平均更新为什么要先减旧值？',
                options: [
                  '为了让 index 归零',
                  '因为即将覆盖的位置保存的是窗口中最旧的样本，不减就会让 sum 多算它',
                  '因为 new_value 一定比旧值大',
                  '为了防止 count 变成 0'
                ],
                answer: 1,
                explain: '窗口满后，index 指向最旧的样本。覆盖之前必须把它从 sum 中减去，否则 sum 会同时包含旧值和新值，平均值偏大。'
              }
            ]
          }
        }
      ]
    }
  ];

  /* ---------------- 导出 ---------------- */

  window.CPP_COURSE = {
    title: 'C++ 交互式课堂',
    subtitle: '从类到数据结构',
    chapters: chapters
  };

  window.CPP_UTIL = {
    escapeHtml: escapeHtml,
    dedent: dedent,
    highlightCpp: highlightCpp,
    same: same
  };
})();
