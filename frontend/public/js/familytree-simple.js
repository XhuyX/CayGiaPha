/**
 * SimpleFamilyTree - Thư viện cây gia phả đơn giản
 * Tạo cho mục đích học tập, thay thế FamilyTree.js
 */

class SimpleFamilyTree {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        this.options = {
            nodeWidth: 180,
            nodeHeight: 80,
            levelHeight: 150,
            siblingGap: 20,
            coupleGap: 40,  // Gap giữa vợ và chồng
            ...options
        };
        
        this.nodes = [];
        this.links = [];
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 50;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.currentNode = null;
        this.editForm = null;
        
        // Event handlers
        this.eventHandlers = {
            click: [],
            update: [],
            remove: []
        };
        
        this.init();
    }
    
    init() {
        // Clear container
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        this.container.style.width = '100%';
        this.container.style.height = '600px';
        this.container.style.border = '1px solid #ddd';
        this.container.style.background = '#f9f9f9';
        
        // Create SVG
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        this.svg.style.cursor = 'grab';
        
        // Create main group for zoom/pan
        this.mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.svg.appendChild(this.mainGroup);
        
        // Create groups for links and nodes
        this.linksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.mainGroup.appendChild(this.linksGroup);
        this.mainGroup.appendChild(this.nodesGroup);
        
        this.container.appendChild(this.svg);
        
        // Add event listeners
        this.addEventListeners();
        
        // Create edit form overlay
        this.createEditForm();
    }
    
    addEventListeners() {
        // Zoom
        this.svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale *= delta;
            this.scale = Math.max(0.1, Math.min(3, this.scale));
            this.updateTransform();
        });
        
        // Pan
        this.svg.addEventListener('mousedown', (e) => {
            if (e.target === this.svg || e.target === this.mainGroup) {
                this.isDragging = true;
                this.dragStartX = e.clientX - this.translateX;
                this.dragStartY = e.clientY - this.translateY;
                this.svg.style.cursor = 'grabbing';
            }
        });
        
        this.svg.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.translateX = e.clientX - this.dragStartX;
                this.translateY = e.clientY - this.dragStartY;
                this.updateTransform();
            }
        });
        
        this.svg.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.svg.style.cursor = 'grab';
        });
        
        this.svg.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.svg.style.cursor = 'grab';
        });
    }
    
    updateTransform() {
        this.mainGroup.setAttribute('transform', 
            `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`);
    }
    
    load(data) {
        if (!Array.isArray(data)) {
            console.error('Data phải là array');
            return;
        }
        
        this.nodes = JSON.parse(JSON.stringify(data));
        this.calculateLayout();
        this.render();
    }
    
    calculateLayout() {
        const { nodeWidth, nodeHeight, levelHeight, siblingGap, coupleGap } = this.options;
        
        // Tạo map nodes theo id
        const nodeMap = {};
        this.nodes.forEach(node => {
            nodeMap[node.id] = node;
            node.children = [];
            node.level = -1;
            node.isProcessed = false;
        });
        
        // Xác định children
        // QUAN TRỌNG: Xây dựng children từ TẤT CẢ parents (allParents) nếu có, không chỉ fid/mid
        this.nodes.forEach(node => {
            // Sử dụng allParents nếu có (bao gồm cả nuôi), nếu không thì dùng fid/mid
            if (node.allParents && Array.isArray(node.allParents)) {
                node.allParents.forEach(parent => {
                    if (parent.id && nodeMap[parent.id]) {
                        if (!nodeMap[parent.id].children.includes(node)) {
                            nodeMap[parent.id].children.push(node);
                        }
                    }
                });
            } else {
                // Fallback: sử dụng fid/mid nếu không có allParents
                if (node.fid && nodeMap[node.fid]) {
                    if (!nodeMap[node.fid].children.includes(node)) {
                        nodeMap[node.fid].children.push(node);
                    }
                }
                if (node.mid && nodeMap[node.mid]) {
                    if (!nodeMap[node.mid].children.includes(node)) {
                        nodeMap[node.mid].children.push(node);
                    }
                }
            }
        });
        
        // Tìm root nodes (không có cha mẹ)
        const roots = this.nodes.filter(n => !n.fid && !n.mid);
        
        // BƯỚC 1: Tính level dựa trên parent-child (ưu tiên cao nhất)
        const queue = [];
        
        // Khởi tạo roots
        roots.forEach(root => {
            root.level = 0;
            queue.push(root);
        });
        
        // BFS: tính level dựa trên parent-child relationship
        while (queue.length > 0) {
            const node = queue.shift();
            
            if (node.isProcessed) continue;
            node.isProcessed = true;
            
            // Xử lý node và set level cho children
            node.children.forEach(child => {
                if (child.level === -1) {
                    child.level = node.level + 1;
                }
                if (!child.isProcessed) {
                    queue.push(child);
                }
            });
        }
        
        // BƯỚC 2: Xử lý spouse - phải cùng level với partner
        // Cần chạy nhiều lần để đảm bảo tất cả spouse được set level
        let spouseUpdated = true;
        let spouseIterations = 0;
        while (spouseUpdated && spouseIterations < 10) {
            spouseUpdated = false;
            spouseIterations++;
            this.nodes.forEach(node => {
                if (node.pids && node.pids.length > 0) {
                    node.pids.forEach(spouseId => {
                        const spouse = nodeMap[spouseId];
                        if (spouse) {
                            // Nếu node có level từ parent-child, spouse theo node
                            // Nếu spouse có level từ parent-child, node theo spouse
                            // Ưu tiên người có level từ parent-child
                            if (node.level !== -1 && spouse.level === -1) {
                                spouse.level = node.level;
                                spouseUpdated = true;
                                // Set level cho spouse theo node
                            } else if (spouse.level !== -1 && node.level === -1) {
                                node.level = spouse.level;
                                spouseUpdated = true;
                                // Set level cho node theo spouse
                            } else if (node.level !== -1 && spouse.level !== -1 && node.level !== spouse.level) {
                                // Cả 2 đều có level nhưng khác nhau, lấy level lớn hơn (deeper)
                                // QUAN TRỌNG: Không bao giờ downgrade level! Chỉ upgrade level.
                                const maxLevel = Math.max(node.level, spouse.level);
                                // Chỉ sync nếu một trong hai có level thấp hơn (upgrade), không downgrade
                                if (node.level < maxLevel || spouse.level < maxLevel) {
                                    const oldNodeLevel = node.level;
                                    const oldSpouseLevel = spouse.level;
                                    // Sync level của cả hai spouse về maxLevel (upgrade, không downgrade)
                                    node.level = maxLevel;
                                    spouse.level = maxLevel;
                                    spouseUpdated = true;
                                }
                            }
                        }
                    });
                }
            });
        }
        
        // BƯỚC 3: Update children của spouse vừa được set level
        // (Vì spouse có thể được set level sau BFS, nên children chưa được xử lý)
        // QUAN TRỌNG: Chỉ update children từ parent-child relationship, KHÔNG thay đổi level của spouse!
        let updated = true;
        let iterations = 0;
        while (updated && iterations < 10) {
            updated = false;
            iterations++;
            this.nodes.forEach(node => {
                if (node.level !== -1 && node.children.length > 0) {
                    node.children.forEach(child => {
                        // Chỉ update nếu child là con thực sự (có fid hoặc mid trỏ đến node này)
                        // KHÔNG update nếu child là spouse (chỉ có pids)
                        const isRealChild = (child.fid === node.id || child.mid === node.id);
                        if (isRealChild) {
                            const expectedLevel = node.level + 1;
                            if (child.level === -1 || child.level < expectedLevel) {
                                const oldLevel = child.level;
                                child.level = expectedLevel;
                                updated = true;
                                // Update level cho child khi parent được upgrade
                            }
                        }
                    });
                }
            });
        }
        
        // BƯỚC 3.5: Đảm bảo spouse cùng level với partner
        // (Cần chạy sau BƯỚC 3 để đảm bảo spouse không bị downgrade level)
        // QUAN TRỌNG: Chỉ upgrade level, không downgrade
        // Và sau đó update lại children vì level của parent đã thay đổi
        let spouse3SyncUpdated = true;
        while (spouse3SyncUpdated) {
            spouse3SyncUpdated = false;
            this.nodes.forEach(node => {
                if (node.pids && node.pids.length > 0) {
                    node.pids.forEach(spouseId => {
                        const spouse = nodeMap[spouseId];
                        if (spouse && node.level !== -1 && spouse.level !== -1 && node.level !== spouse.level) {
                            // Chỉ sync nếu một trong hai có level thấp hơn (upgrade), không downgrade
                            const maxLevel = Math.max(node.level, spouse.level);
                            if (node.level < maxLevel || spouse.level < maxLevel) {
                                const oldNodeLevel = node.level;
                                const oldSpouseLevel = spouse.level;
                                node.level = maxLevel;
                                spouse.level = maxLevel;
                                spouse3SyncUpdated = true;
                                // Final sync: đảm bảo spouse cùng level (upgrade only)
                            }
                        }
                    });
                }
            });
            
            // Sau mỗi lần sync spouse, update lại children của các nodes vừa được upgrade level
            if (spouse3SyncUpdated) {
                let childrenUpdated = false;
                this.nodes.forEach(node => {
                    if (node.level !== -1 && node.children.length > 0) {
                        node.children.forEach(child => {
                            const isRealChild = (child.fid === node.id || child.mid === node.id);
                            if (isRealChild) {
                                const expectedLevel = node.level + 1;
                                if (child.level < expectedLevel) {
                                    const oldLevel = child.level;
                                    child.level = expectedLevel;
                                    childrenUpdated = true;
                                    // Update children level sau khi parent được upgrade
                                }
                            }
                        });
                    }
                });
                if (childrenUpdated) {
                    spouse3SyncUpdated = true; // Continue loop để update children của children vừa được update
                }
            }
        }
        
        // BƯỚC 4: Xử lý nodes chưa có level (orphans) - CHỈ những nodes thực sự không có parent VÀ không có spouse
        this.nodes.forEach(node => {
            if (node.level === -1) {
                // Kiểm tra xem node có spouse không, nếu có và spouse đã có level thì follow spouse
                let shouldBeOrphan = true;
                if (node.pids && node.pids.length > 0) {
                    const spouseId = node.pids[0];
                    const spouse = nodeMap[spouseId];
                    if (spouse && spouse.level !== -1) {
                        node.level = spouse.level;
                        shouldBeOrphan = false;
                        // Late assignment: set level cho node theo spouse
                    }
                }
                
                // Nếu node có parent nhưng không được process, có thể parent không tồn tại
                if (shouldBeOrphan) {
                    if (node.fid || node.mid) {
                        // Node có parent nhưng parent không tồn tại, đặt level = 0
                    }
                    node.level = 0;
                }
            }
        });
        
        // BƯỚC 4.5: Final sync - Đảm bảo TẤT CẢ spouse cùng level (chạy sau cùng để fix mọi trường hợp)
        this.nodes.forEach(node => {
            if (node.pids && node.pids.length > 0 && node.level !== -1) {
                node.pids.forEach(spouseId => {
                    const spouse = nodeMap[spouseId];
                    if (spouse && spouse.level !== -1 && node.level !== spouse.level) {
                        const maxLevel = Math.max(node.level, spouse.level);
                        node.level = maxLevel;
                        spouse.level = maxLevel;
                        // Final sync: đảm bảo tất cả spouse cùng level
                    }
                });
            }
        });
        
        // Layout level by level với xử lý thông minh cho children
        const levels = {};
        this.nodes.forEach(node => {
            if (!levels[node.level]) levels[node.level] = [];
            levels[node.level].push(node);
        });
        
        // Track các nodes đã được positioned bởi parents
        const positionedByParents = new Set();
        
        // Position từng level một cách tuần tự
        Object.keys(levels).sort((a, b) => parseInt(a) - parseInt(b)).forEach(levelKey => {
            const level = parseInt(levelKey);
            const nodesInLevel = levels[levelKey];
            
            // BƯỚC 1: Position children của các couples trong level trước đó
            // (Children sẽ được position dựa vào vị trí parents)
            if (level > 0) {
                const previousLevel = levels[level - 1] || [];
                
                // BƯỚC 1: Position children của couples
                previousLevel.forEach(node => {
                    if (node.pids && node.pids.length > 0) {
                        const spouse = nodeMap[node.pids[0]];
                        if (spouse && spouse.level === node.level && node.id < spouse.id) {
                            // Đảm bảo cả hai đã có positions
                            if (node.x !== undefined && spouse.x !== undefined) {
                                this.positionChildren(node, spouse, nodeWidth, siblingGap, positionedByParents);
                                
                                // Đánh dấu children VÀ spouse của children đã được positioned
                                const nextLevel = node.level + 1;
                                this.nodes.forEach(child => {
                                    if (child.level === nextLevel && 
                                        (child.fid === node.id || child.mid === node.id ||
                                         child.fid === spouse.id || child.mid === spouse.id)) {
                                        positionedByParents.add(child.id);
                                        
                                        // Nếu child có spouse, mark spouse cũng được positioned
                                        if (child.pids && child.pids.length > 0) {
                                            const childSpouse = nodeMap[child.pids[0]];
                                            if (childSpouse && childSpouse.level === nextLevel) {
                                                positionedByParents.add(childSpouse.id);
                                            }
                                        }
                                    }
                                });
                            }
                        }
                    }
                });
                
                // BƯỚC 1.5: Position children của single parents (nodes không có spouse hoặc spouse ở level khác)
                previousLevel.forEach(node => {
                    // Chỉ xử lý single parent (không có spouse hoặc spouse không ở cùng level)
                    const isSingleParent = !node.pids || node.pids.length === 0 || 
                        (node.pids.length > 0 && nodeMap[node.pids[0]] && nodeMap[node.pids[0]].level !== node.level);
                    
                    if (isSingleParent && node.x !== undefined && node.children.length > 0) {
                        const nextLevel = node.level + 1;
                        const { coupleGap } = this.options;
                        const children = node.children.filter(c => 
                            c.level === nextLevel && 
                            (c.fid === node.id || c.mid === node.id) &&
                            !positionedByParents.has(c.id)
                        );
                        
                        if (children.length > 0) {
                            // Positioning children of single parent
                            const parentCenter = node.x + nodeWidth / 2;
                            
                            // Tính total width của children (bao gồm spouse nếu có)
                            const childrenTotalWidth = children.reduce((sum, child, i) => {
                                const childWidth = (child.pids && child.pids.length > 0) 
                                    ? nodeWidth * 2 + coupleGap 
                                    : nodeWidth;
                                return sum + childWidth + (i > 0 ? siblingGap : 0);
                            }, 0);
                            
                            let childX = parentCenter - childrenTotalWidth / 2;
                            children.forEach((child, i) => {
                                const childWidth = (child.pids && child.pids.length > 0) 
                                    ? nodeWidth * 2 + coupleGap 
                                    : nodeWidth;
                                
                                if (child.pids && child.pids.length > 0) {
                                    const spouse = this.nodes.find(n => n.id === child.pids[0] && n.level === nextLevel);
                                    if (spouse) {
                                        const coupleWidth = nodeWidth * 2 + coupleGap;
                                        const childCenter = childX + coupleWidth / 2;
                                        
                                        if (child.gender === 'male') {
                                            child.x = childX;
                                            spouse.x = childX + nodeWidth + coupleGap;
                                        } else {
                                            spouse.x = childX;
                                            child.x = childX + nodeWidth + coupleGap;
                                        }
                                        
                                        child.coupleCenter = childCenter;
                                        spouse.coupleCenter = childCenter;
                                        positionedByParents.add(spouse.id);
                                        childX += coupleWidth;
                                    } else {
                                        child.x = childX;
                                        childX += nodeWidth;
                                    }
                                } else {
                                    child.x = childX;
                                    childX += nodeWidth;
                                }
                                
                                positionedByParents.add(child.id);
                                if (i < children.length - 1) {
                                    childX += siblingGap;
                                }
                            });
                        }
                    }
                });
            }
            
            // BƯỚC 2: Position các nodes CHƯA được positioned (orphans/roots)
            const nodesToPosition = nodesInLevel.filter(n => !positionedByParents.has(n.id));
            
            if (nodesToPosition.length > 0) {
                // Tạo groups chỉ cho các nodes chưa positioned
                const groups = this.createGroupsForLevel(nodesToPosition, nodeMap, level, nodeWidth, coupleGap, siblingGap);
                
                // Tính total width
                const totalWidth = groups.reduce((sum, g) => sum + g.width, 0) + 
                                 Math.max(0, groups.length - 1) * siblingGap;
                
                // Bắt đầu từ center
                let currentX = -totalWidth / 2;
                const y = level * levelHeight;
                
                // Position từng group
                groups.forEach((group, idx) => {
                    this.positionGroup(group, currentX, y, nodeWidth, coupleGap);
                    
                    // Tính width thực tế của group sau khi position
                    const groupActualWidth = group.type === 'couple' 
                        ? (Math.max(...group.nodes.map(n => n.x)) - Math.min(...group.nodes.map(n => n.x)) + nodeWidth)
                        : group.width;
                    
                    currentX += groupActualWidth + siblingGap;
                    
                    // Nếu node trong group đã positioned bởi parent, KHÔNG override
                    // (Trường hợp node vừa là child vừa là spouse)
                    group.nodes.forEach(node => {
                        if (!positionedByParents.has(node.id)) {
                            // Mark as positioned
                            positionedByParents.add(node.id);
                        }
                    });
                });
            }
            
            // BƯỚC 3: Set Y cho TẤT CẢ nodes trong level (kể cả đã positioned)
            nodesInLevel.forEach(node => {
                node.y = level * levelHeight;
                
                // Đảm bảo node có x position
                if (node.x === undefined || node.x === null) {
                    node.x = 0;
                }
            });
        });
        
        // Final check: Đảm bảo TẤT CẢ nodes đều có position
        this.nodes.forEach(node => {
            if (node.x === undefined || node.x === null) {
                console.error(`❌ Node ${node.name} (${node.id}) không có x position sau khi tính layout!`);
                node.x = 0;
            }
            if (node.y === undefined || node.y === null) {
                console.error(`❌ Node ${node.name} (${node.id}) không có y position sau khi tính layout!`);
                node.y = 0;
            }
        });
    }
    
    createGroupsForLevel(nodesInLevel, nodeMap, level, nodeWidth, coupleGap, siblingGap) {
        const groups = [];
        const processed = new Set();
        
        nodesInLevel.forEach(node => {
            if (processed.has(node.id)) return;
            
            if (node.pids && node.pids.length > 0) {
                const spouseId = node.pids[0];
                const spouse = nodeMap[spouseId];
                
                if (spouse && spouse.level === node.level && !processed.has(spouseId)) {
                    // Couple group - tính toán width bao gồm children
                    const coupleWidth = this.calculateCoupleGroupWidth(node, spouse, nodeMap, nodeWidth, coupleGap, siblingGap);
                    groups.push({
                        type: 'couple',
                        nodes: [node, spouse],
                        width: coupleWidth
                    });
                    processed.add(node.id);
                    processed.add(spouseId);
                } else {
                    groups.push({
                        type: 'single',
                        nodes: [node],
                        width: nodeWidth
                    });
                    processed.add(node.id);
                }
            } else {
                groups.push({
                    type: 'single',
                    nodes: [node],
                    width: nodeWidth
                });
                processed.add(node.id);
            }
        });
        
        return groups;
    }
    
    calculateCoupleGroupWidth(parent1, parent2, nodeMap, nodeWidth, coupleGap, siblingGap) {
        // Tìm các loại children
        const leftChildren = this.nodes.filter(n => 
            n.level === parent1.level + 1 && n.fid === parent1.id && !n.mid
        );
        const rightChildren = this.nodes.filter(n => 
            n.level === parent2.level + 1 && n.mid === parent2.id && !n.fid
        );
        const sharedChildren = this.nodes.filter(n => 
            n.level === parent1.level + 1 && 
            ((n.fid === parent1.id && n.mid === parent2.id) ||
             (n.fid === parent2.id && n.mid === parent1.id))
        );
        
        const leftWidth = leftChildren.length > 0 ? 
            leftChildren.length * nodeWidth + (leftChildren.length - 1) * siblingGap : 0;
        const rightWidth = rightChildren.length > 0 ? 
            rightChildren.length * nodeWidth + (rightChildren.length - 1) * siblingGap : 0;
        const sharedWidth = sharedChildren.length > 0 ? 
            sharedChildren.length * nodeWidth + (sharedChildren.length - 1) * siblingGap : 0;
        
        const coupleBaseWidth = nodeWidth * 2 + coupleGap;
        const childrenWidth = leftWidth + rightWidth + sharedWidth + 
                             (leftChildren.length > 0 ? siblingGap : 0) +
                             (rightChildren.length > 0 ? siblingGap : 0);
        
        return Math.max(coupleBaseWidth, childrenWidth);
    }
    
    positionGroup(group, startX, y, nodeWidth, coupleGap) {
        if (group.type === 'couple') {
            const node1 = group.nodes[0];
            const node2 = group.nodes[1];
            
            // Check nếu một trong hai đã được positioned bởi parent
            const node1HasPosition = node1.x !== undefined && node1.x !== null;
            const node2HasPosition = node2.x !== undefined && node2.x !== null;
            
            if (node1HasPosition && !node2HasPosition) {
                // Node1 đã positioned, position node2 bên cạnh
                const newX = node1.x + nodeWidth + coupleGap;
                node2.x = newX;
            } else if (node2HasPosition && !node1HasPosition) {
                // Node2 đã positioned, position node1 bên cạnh
                const newX = node2.x - nodeWidth - coupleGap;
                node1.x = newX;
            } else if (!node1HasPosition && !node2HasPosition) {
                // Cả hai chưa positioned, dùng startX
                const coupleWidth = nodeWidth * 2 + coupleGap;
                const coupleStartX = startX + (group.width - coupleWidth) / 2;
                node1.x = coupleStartX;
                node2.x = coupleStartX + nodeWidth + coupleGap;
            }
            // Nếu cả hai đều đã positioned → giữ nguyên
            
            node1.y = y;
            node2.y = y;
            
            const coupleCenter = (node1.x + node2.x + nodeWidth) / 2;
            node1.coupleCenter = coupleCenter;
            node2.coupleCenter = coupleCenter;
            
            // Lưu groupStartX để position children sau
            node1.groupStartX = startX;
            node2.groupStartX = startX;
        } else {
            const node = group.nodes[0];
            // Chỉ set position nếu chưa được positioned bởi parent
            if (node.x === undefined || node.x === null) {
                // Kiểm tra overlap với các nodes khác ở cùng level
                let finalX = startX;
                const nodeWidth = this.options.nodeWidth;
                
                // Tìm tất cả nodes đã positioned ở cùng level
                const levelNum = y / this.options.levelHeight;
                const positionedNodes = this.nodes.filter(n => 
                    n.level === levelNum && 
                    n.x !== undefined && 
                    n.id !== node.id
                );
                
                // Tạo map để track couples đã processed
                const processedCouples = new Set();
                
                // Kiểm tra overlap
                let hasOverlap = true;
                let attempts = 0;
                while (hasOverlap && attempts < 100) {
                    hasOverlap = false;
                    for (const otherNode of positionedNodes) {
                        // Skip nếu đã check couple này rồi
                        if (otherNode.pids && otherNode.pids.length > 0) {
                            const coupleKey = `${Math.min(otherNode.id, otherNode.pids[0])}-${Math.max(otherNode.id, otherNode.pids[0])}`;
                            if (processedCouples.has(coupleKey)) continue;
                            processedCouples.add(coupleKey);
                        }
                        
                        let otherX = otherNode.x;
                        let otherWidth = nodeWidth;
                        
                        // Nếu node có spouse, tính width của cả couple
                        if (otherNode.pids && otherNode.pids.length > 0) {
                            const spouseId = otherNode.pids[0];
                            const spouse = this.nodes.find(n => n.id === spouseId && n.level === levelNum);
                            if (spouse && spouse.x !== undefined) {
                                // Tính x min và x max của couple
                                const minX = Math.min(otherX, spouse.x);
                                const maxX = Math.max(otherX, spouse.x);
                                otherX = minX;
                                otherWidth = maxX - minX + nodeWidth + this.options.coupleGap;
                            } else {
                                // Spouse chưa có position, chỉ tính node này
                                otherWidth = nodeWidth * 2 + this.options.coupleGap;
                            }
                        }
                        
                        // Kiểm tra overlap
                        const nodeLeft = finalX;
                        const nodeRight = finalX + nodeWidth;
                        const otherLeft = otherX;
                        const otherRight = otherX + otherWidth;
                        
                        if (!(nodeRight <= otherLeft || nodeLeft >= otherRight)) {
                            // Overlap detected!
                            hasOverlap = true;
                            // Move to the right of the overlapping node/couple
                            finalX = otherRight + this.options.siblingGap;
                            const overlapName = (otherNode.pids && otherNode.pids.length > 0) 
                                ? `${otherNode.name} + spouse`
                                : otherNode.name;
                            // Overlap detected, adjust position
                            break;
                        }
                    }
                    // Reset processed couples for next attempt
                    processedCouples.clear();
                    attempts++;
                }
                
                // Set position for single node (overlap checked)
                node.x = finalX;
            } else {
                // Node already has position, keep it
            }
            node.y = y;
        }
    }
    
    positionChildren(parent1, parent2, nodeWidth, siblingGap, positionedByParents) {
        // Check if parents have positions
        if (parent1.x === undefined || parent2.x === undefined) {
            return;
        }
        
        // Positioning children of couple
        
        const nextLevel = parent1.level + 1;
        const { coupleGap } = this.options;
        
        // Phân loại children
        const leftChildren = this.nodes.filter(n => 
            n.level === nextLevel && n.fid === parent1.id && !n.mid
        );
        const rightChildren = this.nodes.filter(n => 
            n.level === nextLevel && n.mid === parent2.id && !n.fid
        );
        const sharedChildren = this.nodes.filter(n => 
            n.level === nextLevel && 
            ((n.fid === parent1.id && n.mid === parent2.id) ||
             (n.fid === parent2.id && n.mid === parent1.id))
        );
        
        // Nếu không có children, return
        if (leftChildren.length === 0 && rightChildren.length === 0 && sharedChildren.length === 0) {
            return;
        }
        
        const coupleCenter = parent1.coupleCenter || (parent1.x + parent2.x + nodeWidth) / 2;
        
        // Helper: Tính width của một child (bao gồm cả spouse nếu có)
        const getChildWidth = (child) => {
            if (child.pids && child.pids.length > 0) {
                // Child có spouse → cần 2 nodes + couple gap
                return nodeWidth * 2 + coupleGap;
            }
            return nodeWidth;
        };
        
        // Helper: Tính total width của một nhóm children (bao gồm spouse)
        const calculateGroupWidth = (children) => {
            if (children.length === 0) return 0;
            let totalWidth = 0;
            children.forEach((child, i) => {
                const childWidth = getChildWidth(child);
                totalWidth += childWidth;
                if (i < children.length - 1) totalWidth += siblingGap;
            });
            return totalWidth;
        };
        
        // Helper: Position một nhóm children và spouse của họ
        const positionChildGroup = (children, startX) => {
            let x = startX;
            children.forEach((child, i) => {
                // Nếu child có spouse, tính center của couple trước
                if (child.pids && child.pids.length > 0) {
                    const spouse = this.nodes.find(n => n.id === child.pids[0]);
                    if (spouse && spouse.level === nextLevel) {
                        // Position child và spouse như một couple
                        // Child ở bên trái (male) hoặc bên phải (female) tùy giới tính
                        const coupleWidth = nodeWidth * 2 + coupleGap;
                        const childX = x; // Child ở bắt đầu couple
                        const spouseX = x + nodeWidth + coupleGap; // Spouse ở cuối couple
                        
                        // Đảm bảo male ở trái, female ở phải
                        // Nếu child là male → child ở trái, spouse ở phải
                        // Nếu child là female → tìm spouse (phải là male) → spouse ở trái, child ở phải
                        let maleX, femaleX;
                        if (child.gender === 'male') {
                            maleX = childX;
                            femaleX = spouseX;
                            // Position couple (male child, female spouse)
                        } else {
                            // Child là female, spouse phải là male → spouse ở trái
                            maleX = childX;
                            femaleX = spouseX;
                            // Position couple (female child, male spouse)
                        }
                        
                        // Set positions theo gender
                        if (child.gender === 'male') {
                            child.x = maleX;
                            spouse.x = femaleX;
                        } else {
                            spouse.x = maleX;
                            child.x = femaleX;
                        }
                        
                        // Lưu coupleCenter để render links
                        const coupleCenterX = x + coupleWidth / 2;
                        child.coupleCenter = coupleCenterX;
                        spouse.coupleCenter = coupleCenterX;
                        
                        // Mark spouse as positioned
                        positionedByParents.add(spouse.id);
                        
                        // Move to next position
                        x += coupleWidth;
                    } else {
                        // Spouse không ở cùng level, chỉ position child
                        // Position child
                        child.x = x;
                        x += nodeWidth;
                    }
                } else {
                    // Child không có spouse
                    // Position single child
                    child.x = x;
                    x += nodeWidth;
                }
                
                // Add sibling gap (except for last child)
                if (i < children.length - 1) {
                    x += siblingGap;
                }
            });
        };
        
        // STRATEGY: Position 3 nhóm độc lập
        // 1. Shared children ở GIỮA couple (priority cao nhất)
        // 2. Left children ở BÊN TRÁI shared (hoặc bên trái couple nếu không có shared)
        // 3. Right children ở BÊN PHẢI shared (hoặc bên phải couple nếu không có shared)
        
        const leftWidth = calculateGroupWidth(leftChildren);
        const sharedWidth = calculateGroupWidth(sharedChildren);
        const rightWidth = calculateGroupWidth(rightChildren);
        
        
        let sharedStartX, leftStartX, rightStartX;
        
        if (sharedChildren.length > 0) {
            // Shared children ở giữa couple
            sharedStartX = coupleCenter - sharedWidth / 2;
            
            // Left children ở bên trái shared (có gap)
            if (leftChildren.length > 0) {
                leftStartX = sharedStartX - siblingGap - leftWidth;
            }
            
            // Right children ở bên phải shared (có gap)
            if (rightChildren.length > 0) {
                rightStartX = sharedStartX + sharedWidth + siblingGap;
            }
        } else {
            // Không có con chung, chỉ có con riêng
            if (leftChildren.length > 0 && rightChildren.length > 0) {
                // Cả 2 bên đều có con riêng
                const totalWidth = leftWidth + siblingGap + rightWidth;
                leftStartX = coupleCenter - totalWidth / 2;
                rightStartX = leftStartX + leftWidth + siblingGap;
            } else if (leftChildren.length > 0) {
                // Chỉ có con riêng bên trái
                leftStartX = coupleCenter - leftWidth / 2;
            } else {
                // Chỉ có con riêng bên phải
                rightStartX = coupleCenter - rightWidth / 2;
            }
        }
        
        // Position các nhóm (với validation)
        if (leftChildren.length > 0 && leftStartX !== undefined) {
            positionChildGroup(leftChildren, leftStartX);
        }
        if (sharedChildren.length > 0 && sharedStartX !== undefined) {
            positionChildGroup(sharedChildren, sharedStartX);
        }
        if (rightChildren.length > 0 && rightStartX !== undefined) {
            positionChildGroup(rightChildren, rightStartX);
        }
    }
    
    render() {
        // Clear
        this.nodesGroup.innerHTML = '';
        this.linksGroup.innerHTML = '';
        
        // Tìm tất cả couples
        const processedChildren = new Set();
        
        // Render spouse links và parent-child links
        this.nodes.forEach(node => {
            // Render spouse link (chỉ khi có pids và pids không rỗng)
            if (node.pids && Array.isArray(node.pids) && node.pids.length > 0) {
                node.pids.forEach(pid => {
                    const spouse = this.nodes.find(n => n.id === pid);
                    // Đảm bảo spouse tồn tại và cùng level (có thể đã bị xóa quan hệ)
                    if (spouse && node.id < pid && spouse.level === node.level && 
                        spouse.pids && Array.isArray(spouse.pids) && spouse.pids.includes(node.id)) {
                        this.renderSpouseLink(node, spouse);
                        
                        // Render TẤT CẢ children của couple (bao gồm con riêng)
                        // Sử dụng allParents nếu có, fallback về fid/mid
                        const leftChildren = this.nodes.filter(n => {
                            if (n.level !== node.level + 1) return false;
                            // Kiểm tra xem có parent này trong allParents không
                            if (n.allParents && Array.isArray(n.allParents)) {
                                const hasThisParent = n.allParents.some(p => p.id === node.id);
                                const hasSpouseParent = n.allParents.some(p => p.id === spouse.id);
                                return hasThisParent && !hasSpouseParent;
                            }
                            // Fallback
                            return n.fid === node.id && !n.mid;
                        });
                        const rightChildren = this.nodes.filter(n => {
                            if (n.level !== spouse.level + 1) return false;
                            // Kiểm tra xem có parent này trong allParents không
                            if (n.allParents && Array.isArray(n.allParents)) {
                                const hasThisParent = n.allParents.some(p => p.id === spouse.id);
                                const hasSpouseParent = n.allParents.some(p => p.id === node.id);
                                return hasThisParent && !hasSpouseParent;
                            }
                            // Fallback
                            return n.mid === spouse.id && !n.fid;
                        });
                        const sharedChildren = this.nodes.filter(n => {
                            if (n.level !== node.level + 1) return false;
                            // Kiểm tra xem có cả 2 parents trong allParents không
                            if (n.allParents && Array.isArray(n.allParents)) {
                                const hasNodeParent = n.allParents.some(p => p.id === node.id);
                                const hasSpouseParent = n.allParents.some(p => p.id === spouse.id);
                                return hasNodeParent && hasSpouseParent;
                            }
                            // Fallback
                            return ((n.fid === node.id && n.mid === spouse.id) ||
                                    (n.fid === spouse.id && n.mid === node.id));
                        });
                        
                        // Render links cho từng nhóm children
                        if (leftChildren.length > 0 || rightChildren.length > 0 || sharedChildren.length > 0) {
                            this.renderCoupleWithAllChildrenLinks(node, spouse, leftChildren, sharedChildren, rightChildren);
                            leftChildren.forEach(c => processedChildren.add(c.id));
                            rightChildren.forEach(c => processedChildren.add(c.id));
                            sharedChildren.forEach(c => processedChildren.add(c.id));
                        }
                    }
                });
            }
        });
        
        // Render single parent to children links (bao gồm cả trường hợp parent đã từng có spouse nhưng bây giờ không còn)
        // QUAN TRỌNG: Phải render children của các parent không có spouse link hoặc có spouse nhưng không cùng level
        this.nodes.forEach(parent => {
            // Lấy tất cả children của parent này
            // Kiểm tra cả allParents (để bao gồm cả mẹ nuôi) và fid/mid (tương thích ngược)
            const allChildren = parent.children.filter(c => {
                // Kiểm tra xem child có parent này trong allParents không
                if (c.allParents && Array.isArray(c.allParents)) {
                    return c.allParents.some(p => p.id === parent.id);
                }
                // Fallback: kiểm tra fid/mid
                return (c.fid === parent.id || c.mid === parent.id);
            });
            
            // Filter children để quyết định render
            // QUY TẮC CHÍNH XÁC:
            // 1. Nếu child KHÔNG được render từ couple → LUÔN render từ parent này
            // 2. Nếu child ĐÃ được render từ couple:
            //    - Nếu parent KHÔNG trong couple → LUÔN render (ví dụ: Yu render Soka)
            //    - Nếu parent TRONG couple → KHÔNG render (đã render từ couple center rồi, dù child có 3+ parents)
            // 
            // LÝ DO: Khi child có nhiều parents (3+), ta vẫn CHỈ render từ couple center cho parents trong couple,
            // và render riêng từ các parents KHÔNG trong couple (như mẹ nuôi Yu).
            // KHÔNG cần render riêng từ Tôi và Asaka vì đã có link từ couple center rồi.
            const childrenToRender = allChildren.filter(child => {
                const wasRenderedFromCouple = processedChildren.has(child.id);
                
                // Nếu child KHÔNG được render từ couple → LUÔN render từ parent này
                if (!wasRenderedFromCouple) {
                    return true;
                }
                
                // Nếu child ĐÃ được render từ couple → kiểm tra xem parent có trong couple không
                // Tìm couple mà parent này tham gia (nếu có)
                let parentInCouple = null;
                if (parent.pids && parent.pids.length > 0) {
                    const spouse = this.nodes.find(n => n.id === parent.pids[0]);
                    if (spouse && spouse.level === parent.level && 
                        spouse.pids && Array.isArray(spouse.pids) && spouse.pids.includes(parent.id)) {
                        parentInCouple = { node: parent, spouse: spouse };
                    }
                }
                
                // Nếu parent KHÔNG trong couple → LUÔN render (ví dụ: Yu render Soka)
                if (!parentInCouple) {
                    return true;
                }
                
                // Nếu parent TRONG couple → KHÔNG render link riêng
                // (đã render từ couple center rồi, dù child có 3+ parents)
                // Link từ couple center đã đủ để hiển thị mối quan hệ giữa parents trong couple và child
                return false;
            });
            
            if (childrenToRender.length > 0) {
                this.renderParentToChildrenLinks(parent, childrenToRender);
            }
        });
        
        // Render nodes
        this.nodes.forEach(node => {
            this.renderNode(node);
        });
        
        // Center view
        this.fit();
    }
    
    renderCoupleWithAllChildrenLinks(parent1, parent2, leftChildren, sharedChildren, rightChildren) {
        const { nodeWidth, nodeHeight } = this.options;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        const parent1X = parent1.x + nodeWidth / 2;
        const parent1Y = parent1.y + nodeHeight;
        const parent2X = parent2.x + nodeWidth / 2;
        const parent2Y = parent2.y + nodeHeight;
        
        // Vẽ đường cho con riêng bên trái (chỉ của parent1)
        leftChildren.forEach(child => {
            const childCenter = child.coupleCenter !== undefined 
                ? child.coupleCenter 
                : child.x + nodeWidth / 2;
            const childY = child.y;
            const midY = (parent1Y + childY) / 2;
            
            // Đường thẳng từ parent1 xuống child
            const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line1.setAttribute('x1', parent1X);
            line1.setAttribute('y1', parent1Y);
            line1.setAttribute('x2', parent1X);
            line1.setAttribute('y2', midY);
            line1.setAttribute('stroke', '#2196f3');
            line1.setAttribute('stroke-width', '2');
            g.appendChild(line1);
            
            const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line2.setAttribute('x1', parent1X);
            line2.setAttribute('y1', midY);
            line2.setAttribute('x2', childCenter);
            line2.setAttribute('y2', midY);
            line2.setAttribute('stroke', '#2196f3');
            line2.setAttribute('stroke-width', '2');
            g.appendChild(line2);
            
            const line3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line3.setAttribute('x1', childCenter);
            line3.setAttribute('y1', midY);
            line3.setAttribute('x2', childCenter);
            line3.setAttribute('y2', childY);
            line3.setAttribute('stroke', '#2196f3');
            line3.setAttribute('stroke-width', '2');
            g.appendChild(line3);
        });
        
        // Vẽ đường cho con chung (từ giữa couple)
        if (sharedChildren.length > 0) {
            const coupleX = parent1.coupleCenter || (parent1X + parent2X) / 2;
            // Tính center của mỗi child (nếu có spouse thì dùng coupleCenter, không thì dùng x + nodeWidth/2)
            const childrenX = sharedChildren.map(c => {
                if (c.coupleCenter !== undefined) {
                    return c.coupleCenter;
                }
                return c.x + nodeWidth / 2;
            });
            const minX = Math.min(...childrenX);
            const maxX = Math.max(...childrenX);
            const midY = (parent1Y + sharedChildren[0].y) / 2;
            
            // Đường từ couple xuống
            const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line1.setAttribute('x1', coupleX);
            line1.setAttribute('y1', parent1Y);
            line1.setAttribute('x2', coupleX);
            line1.setAttribute('y2', midY);
            line1.setAttribute('stroke', '#9c27b0');
            line1.setAttribute('stroke-width', '2');
            g.appendChild(line1);
            
            // Đường ngang nối children
            if (sharedChildren.length > 1) {
                const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line2.setAttribute('x1', minX);
                line2.setAttribute('y1', midY);
                line2.setAttribute('x2', maxX);
                line2.setAttribute('y2', midY);
                line2.setAttribute('stroke', '#9c27b0');
                line2.setAttribute('stroke-width', '2');
                g.appendChild(line2);
            }
            
            // Đường xuống mỗi child (hoặc couple nếu child có spouse)
            sharedChildren.forEach(child => {
                const childCenter = child.coupleCenter !== undefined 
                    ? child.coupleCenter 
                    : child.x + nodeWidth / 2;
                const line3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line3.setAttribute('x1', childCenter);
                line3.setAttribute('y1', midY);
                line3.setAttribute('x2', childCenter);
                line3.setAttribute('y2', child.y);
                line3.setAttribute('stroke', '#9c27b0');
                line3.setAttribute('stroke-width', '2');
                g.appendChild(line3);
            });
        }
        
        // Vẽ đường cho con riêng bên phải (chỉ của parent2)
        rightChildren.forEach(child => {
            const childCenter = child.coupleCenter !== undefined 
                ? child.coupleCenter 
                : child.x + nodeWidth / 2;
            const childY = child.y;
            const midY = (parent2Y + childY) / 2;
            
            // Đường thẳng từ parent2 xuống child
            const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line1.setAttribute('x1', parent2X);
            line1.setAttribute('y1', parent2Y);
            line1.setAttribute('x2', parent2X);
            line1.setAttribute('y2', midY);
            line1.setAttribute('stroke', '#e91e63');
            line1.setAttribute('stroke-width', '2');
            g.appendChild(line1);
            
            const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line2.setAttribute('x1', parent2X);
            line2.setAttribute('y1', midY);
            line2.setAttribute('x2', childCenter);
            line2.setAttribute('y2', midY);
            line2.setAttribute('stroke', '#e91e63');
            line2.setAttribute('stroke-width', '2');
            g.appendChild(line2);
            
            const line3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line3.setAttribute('x1', childCenter);
            line3.setAttribute('y1', midY);
            line3.setAttribute('x2', childCenter);
            line3.setAttribute('y2', childY);
            line3.setAttribute('stroke', '#e91e63');
            line3.setAttribute('stroke-width', '2');
            g.appendChild(line3);
        });
        
        this.linksGroup.appendChild(g);
    }
    
    renderParentToChildrenLinks(parent, children) {
        const { nodeWidth, nodeHeight } = this.options;
        
        // QUAN TRỌNG: Tính parentX - LUÔN dùng center của parent node (không dùng coupleCenter)
        // Lý do: Đây là link riêng từ single parent, không phải từ couple center
        // Nếu dùng coupleCenter sẽ làm link trỏ đến giữa couple (marriage link) thay vì trỏ đến child
        const parentX = parent.x + nodeWidth / 2;
        const parentY = parent.y + nodeHeight;
        
        // Tìm min/max X của children (nếu child có spouse thì dùng coupleCenter)
        const childrenX = children.map(c => {
            if (c.coupleCenter !== undefined) {
                return c.coupleCenter;
            }
            return c.x + nodeWidth / 2;
        });
        const minX = Math.min(...childrenX);
        const maxX = Math.max(...childrenX);
        const midY = (parentY + children[0].y) / 2;
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // 1. Đường từ parent xuống midY
        const verticalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        verticalLine.setAttribute('x1', parentX);
        verticalLine.setAttribute('y1', parentY);
        verticalLine.setAttribute('x2', parentX);
        verticalLine.setAttribute('y2', midY);
        verticalLine.setAttribute('stroke', '#999');
        verticalLine.setAttribute('stroke-width', '2');
        g.appendChild(verticalLine);
        
        if (children.length > 1) {
            // 2. Đường ngang nối các children
            const horizontalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            horizontalLine.setAttribute('x1', minX);
            horizontalLine.setAttribute('y1', midY);
            horizontalLine.setAttribute('x2', maxX);
            horizontalLine.setAttribute('y2', midY);
            horizontalLine.setAttribute('stroke', '#999');
            horizontalLine.setAttribute('stroke-width', '2');
            g.appendChild(horizontalLine);
        }
        
        // 3. Đường từ midY xuống mỗi child (hoặc couple nếu child có spouse)
        // QUAN TRỌNG: childCenter phải là center của CHILD node, không phải của parent
        children.forEach(child => {
            const childCenter = child.coupleCenter !== undefined 
                ? child.coupleCenter 
                : child.x + nodeWidth / 2;
            const childY = child.y;
            
            const childLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            childLine.setAttribute('x1', childCenter);
            childLine.setAttribute('y1', midY);
            childLine.setAttribute('x2', childCenter);
            childLine.setAttribute('y2', childY);
            childLine.setAttribute('stroke', '#999');
            childLine.setAttribute('stroke-width', '2');
            g.appendChild(childLine);
        });
        
        this.linksGroup.appendChild(g);
    }
    
    renderSpouseLink(node1, node2) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const { nodeWidth, nodeHeight } = this.options;
        
        const x1 = node1.x + nodeWidth;
        const y1 = node1.y + nodeHeight / 2;
        const x2 = node2.x;
        const y2 = node2.y + nodeHeight / 2;
        
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', '#e91e63');
        line.setAttribute('stroke-width', '3');
        
        this.linksGroup.appendChild(line);
    }
    
    renderNode(node) {
        const { nodeWidth, nodeHeight } = this.options;
        
        // Group
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
        g.setAttribute('data-node-id', node.id);
        g.style.cursor = 'pointer';
        
        // Shadow
        const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        shadow.setAttribute('width', nodeWidth);
        shadow.setAttribute('height', nodeHeight);
        shadow.setAttribute('rx', '5');
        shadow.setAttribute('fill', 'rgba(0,0,0,0.1)');
        shadow.setAttribute('transform', 'translate(2, 2)');
        
        // Background
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', nodeWidth);
        rect.setAttribute('height', nodeHeight);
        rect.setAttribute('rx', '8');
        rect.setAttribute('fill', 'white');
        rect.setAttribute('stroke', node.gender === 'male' ? '#2196f3' : '#e91e63');
        rect.setAttribute('stroke-width', '3');
        
        // Gradient background
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        gradient.setAttribute('width', nodeWidth);
        gradient.setAttribute('height', nodeHeight);
        gradient.setAttribute('rx', '8');
        gradient.setAttribute('fill', node.gender === 'male' ? 'rgba(33, 150, 243, 0.08)' : 'rgba(233, 30, 99, 0.08)');
        
        // Image
        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', node.img || '');
        image.setAttribute('x', '10');
        image.setAttribute('y', '15');
        image.setAttribute('width', '50');
        image.setAttribute('height', '50');
        image.setAttribute('clip-path', 'circle(25px at 25px 25px)');
        
        // Name
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '70');
        text.setAttribute('y', '30');
        text.setAttribute('font-size', '13');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', '#222');
        text.textContent = node.name.length > 15 ? node.name.substring(0, 14) + '...' : node.name;
        
        // DOB - DOD
        const dates = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dates.setAttribute('x', '70');
        dates.setAttribute('y', '50');
        dates.setAttribute('font-size', '10');
        dates.setAttribute('fill', '#666');
        const dobText = node.dob || '?';
        const dodText = node.dod ? ` - ${node.dod}` : '';
        dates.textContent = `${dobText}${dodText}`;
        
        g.appendChild(shadow);
        g.appendChild(rect);
        g.appendChild(gradient);
        g.appendChild(image);
        g.appendChild(text);
        g.appendChild(dates);
        
        // Events
        g.addEventListener('click', (e) => {
            e.stopPropagation();
            this.triggerEvent('click', node);
        });
        
        g.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showContextMenu(e, node);
        });
        
        this.nodesGroup.appendChild(g);
    }
    
    showContextMenu(e, node) {
        // Remove existing menu
        const existingMenu = document.getElementById('sft-context-menu');
        if (existingMenu) existingMenu.remove();
        
        const menu = document.createElement('div');
        menu.id = 'sft-context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${e.clientX}px;
            top: ${e.clientY}px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 10000;
            min-width: 120px;
        `;
        
        const menuItems = [
            { label: '👁️ Chi tiết', action: () => this.triggerEvent('click', node) },
            { label: '✏️ Sửa', action: () => this.showEditForm(node) },
            { label: '🗑️ Xóa', action: () => this.removeNode(node) }
        ];
        
        menuItems.forEach(item => {
            const div = document.createElement('div');
            div.textContent = item.label;
            div.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid #eee;
            `;
            div.addEventListener('mouseenter', () => div.style.background = '#f0f0f0');
            div.addEventListener('mouseleave', () => div.style.background = 'white');
            div.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
            menu.appendChild(div);
        });
        
        document.body.appendChild(menu);
        
        // Close on click outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            });
        }, 100);
    }
    
    createEditForm() {
        const overlay = document.createElement('div');
        overlay.id = 'sft-edit-overlay';
        overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
            align-items: center;
            justify-content: center;
        `;
        
        const formContainer = document.createElement('div');
        formContainer.id = 'sft-form-container';
        formContainer.style.cssText = `
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
            position: relative;
        `;
        
        // Background với Diagonal Cross Center Fade Grid
        const bgOverlay = document.createElement('div');
        bgOverlay.style.cssText = `
            position: absolute;
            inset: 0;
            background-image: 
                linear-gradient(45deg, transparent 49%, #e5e7eb 49%, #e5e7eb 51%, transparent 51%),
                linear-gradient(-45deg, transparent 49%, #e5e7eb 49%, #e5e7eb 51%, transparent 51%);
            background-size: 40px 40px;
            -webkit-mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 70%);
            mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 70%);
            pointer-events: none;
            z-index: 0;
        `;
        formContainer.appendChild(bgOverlay);
        
        const formContent = document.createElement('div');
        formContent.style.cssText = `
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            height: 100%;
            max-height: 90vh;
            min-height: 0;
        `;
        
        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
            flex-shrink: 0;
        `;
        header.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #1f2937;">Sửa Thông Tin Thành Viên</h3>
                <button id="sft-close-btn" style="background: none; border: none; font-size: 24px; color: #6b7280; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: all 0.2s;" onmouseover="this.style.background='#f3f4f6'; this.style.color='#374151';" onmouseout="this.style.background='none'; this.style.color='#6b7280';">&times;</button>
            </div>
        `;
        formContent.appendChild(header);
        
        // Scrollable content area
        const scrollArea = document.createElement('div');
        scrollArea.id = 'sft-scroll-area';
        scrollArea.style.cssText = `
            flex: 1 1 auto;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 20px 24px;
            min-height: 0;
            max-height: calc(90vh - 180px);
        `;
        
        // Custom scrollbar styling
        const style = document.createElement('style');
        style.textContent = `
            #sft-scroll-area::-webkit-scrollbar {
                width: 8px;
            }
            #sft-scroll-area::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 4px;
            }
            #sft-scroll-area::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 4px;
            }
            #sft-scroll-area::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }
        `;
        document.head.appendChild(style);
        scrollArea.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #374151;">Họ và Tên *</label>
                    <input type="text" id="sft-name" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; transition: border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6';" onblur="this.style.borderColor='#d1d5db';">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #374151;">Giới tính *</label>
                    <select id="sft-gender" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; transition: border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6';" onblur="this.style.borderColor='#d1d5db';">
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                    </select>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #374151;">Năm sinh</label>
                    <input type="text" id="sft-dob" placeholder="VD: 1990" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; transition: border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6';" onblur="this.style.borderColor='#d1d5db';">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #374151;">Năm mất</label>
                    <input type="text" id="sft-dod" placeholder="VD: 2020 (để trống nếu còn sống)" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; transition: border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6';" onblur="this.style.borderColor='#d1d5db';">
                </div>
            </div>
            
            <div style="margin-bottom: 16px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #374151;">Danh sách Bố</label>
                <div id="sft-father-list" style="margin-bottom: 8px; max-height: 120px; overflow-y: auto;">
                    <!-- Danh sách bố sẽ được thêm vào đây -->
                </div>
                <button type="button" id="sft-add-father-btn" style="padding: 6px 12px; font-size: 12px; background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; border-radius: 6px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#bfdbfe';" onmouseout="this.style.background='#dbeafe';">+ Thêm Bố</button>
            </div>
            
            <div style="margin-bottom: 16px; padding: 16px; background: #fdf2f8; border-radius: 8px; border: 1px solid #fce7f3;">
                <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #374151;">Danh sách Mẹ</label>
                <div id="sft-mother-list" style="margin-bottom: 8px; max-height: 120px; overflow-y: auto;">
                    <!-- Danh sách mẹ sẽ được thêm vào đây -->
                </div>
                <button type="button" id="sft-add-mother-btn" style="padding: 6px 12px; font-size: 12px; background: #fce7f3; color: #9f1239; border: 1px solid #fbcfe8; border-radius: 6px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#fbcfe8';" onmouseout="this.style.background='#fce7f3';">+ Thêm Mẹ</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #374151;">Tình trạng hôn nhân</label>
                    <select id="sft-marital-status" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; transition: border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6';" onblur="this.style.borderColor='#d1d5db';">
                        <option value="single">Độc thân</option>
                        <option value="married">Đã kết hôn</option>
                        <option value="divorced">Đã ly hôn</option>
                    </select>
                </div>
                <div id="sft-spouse-div" style="display: none;">
                    <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #374151;">Chọn Vợ/Chồng</label>
                    <select id="sft-spouse" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; transition: border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6';" onblur="this.style.borderColor='#d1d5db';">
                        <option value="">-- Không chọn --</option>
                    </select>
                </div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #374151;">Ảnh URL</label>
                <input type="text" id="sft-img" placeholder="https://..." style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; transition: border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6';" onblur="this.style.borderColor='#d1d5db';">
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #374151;">Tiểu sử</label>
                <textarea id="sft-tieusu" rows="3" placeholder="Nhập tiểu sử..." style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical; transition: border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6';" onblur="this.style.borderColor='#d1d5db';"></textarea>
            </div>
        `;
        formContent.appendChild(scrollArea);
        
        // Footer với buttons
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 16px 24px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            flex-shrink: 0;
        `;
        footer.innerHTML = `
            <button id="sft-cancel" style="padding: 10px 20px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer; font-size: 14px; font-weight: 500; color: #374151; transition: all 0.2s;" onmouseover="this.style.background='#f9fafb'; this.style.borderColor='#9ca3af';" onmouseout="this.style.background='white'; this.style.borderColor='#d1d5db';">Hủy</button>
            <button id="sft-save" style="padding: 10px 20px; border: none; border-radius: 6px; background: #3b82f6; color: white; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background='#2563eb';" onmouseout="this.style.background='#3b82f6';">Lưu Thay Đổi</button>
        `;
        formContent.appendChild(footer);
        
        formContainer.appendChild(formContent);
        overlay.appendChild(formContainer);
        document.body.appendChild(overlay);
        
        this.editFormOverlay = overlay;
        
        // Close button handler
        document.getElementById('sft-close-btn').addEventListener('click', () => {
            this.hideEditForm();
        });
    }
    
    hideEditForm() {
        if (this.editFormOverlay) {
            this.editFormOverlay.style.display = 'none';
        }
    }
    
    async showEditForm(node) {
        this.currentNode = node;
        
        // Populate basic fields
        document.getElementById('sft-name').value = node.name || '';
        document.getElementById('sft-gender').value = node.gender || 'male';
        document.getElementById('sft-dob').value = node.dob || '';
        document.getElementById('sft-dod').value = node.dod || '';
        document.getElementById('sft-img').value = node.img || '';
        document.getElementById('sft-tieusu').value = node.tieuSu || '';
        
        // Load tất cả cha mẹ từ backend
        let allParents = [];
        try {
            const response = await fetch(`http://localhost:3000/api/members/${node.id}`);
            if (response.ok) {
                const result = await response.json();
                if (result.member && result.member.family && result.member.family.parents) {
                    allParents = result.member.family.parents;
                }
            }
        } catch (err) {
            console.error('Error loading all parents:', err);
        }
        
        // Phân loại cha và mẹ từ dữ liệu backend
        // Lưu ý: Backend trả về ParentId (số) và LoaiQuanHe (string)
        // Cần lấy tất cả nodes trong cây để hiển thị trong dropdown
        const fathers = allParents.filter(p => {
            // Tìm node trong cây hiện tại
            const parentNode = this.nodes.find(n => n.id === p.ParentId);
            // Nếu tìm thấy trong nodes, kiểm tra gender; nếu không, dựa vào LoaiQuanHe
            if (parentNode) {
                return parentNode.gender === 'male';
            }
            // Nếu không tìm thấy trong nodes, dựa vào LoaiQuanHe
            return p.LoaiQuanHe && p.LoaiQuanHe.includes('Cha');
        });
        const mothers = allParents.filter(p => {
            const parentNode = this.nodes.find(n => n.id === p.ParentId);
            if (parentNode) {
                return parentNode.gender === 'female';
            }
            // Nếu không tìm thấy trong nodes, dựa vào LoaiQuanHe
            return p.LoaiQuanHe && p.LoaiQuanHe.includes('Mẹ');
        });
        
        // Clear lists
        document.getElementById('sft-father-list').innerHTML = '';
        document.getElementById('sft-mother-list').innerHTML = '';
        
        // Helper function để tạo row cho cha/mẹ
        const createParentRow = (parentId, relationType, isFather, rowId) => {
            const listId = isFather ? 'sft-father-list' : 'sft-mother-list';
            const list = document.getElementById(listId);
            
            // Xác định relationType mặc định nếu không có
            const defaultRelationType = isFather ? 'Cha ruột' : 'Mẹ ruột';
            const selectedRelationType = relationType || defaultRelationType;
            
            // Tạo dropdown options cho parent select (chỉ hiển thị nodes cùng giới tính)
            const genderFilter = isFather ? 'male' : 'female';
            const parentOptions = this.nodes
                .filter(n => n.id !== node.id && n.gender === genderFilter)
                .map(n => {
                    const selected = parentId && n.id === parentId ? 'selected' : '';
                    return `<option value="${n.id}" ${selected}>${n.name}</option>`;
                })
                .join('');
            
            const row = document.createElement('div');
            row.id = rowId;
            row.className = 'flex gap-2 items-end';
            row.style.marginBottom = '8px';
            row.innerHTML = `
                <div style="flex: 1;">
                    <select class="sft-parent-select" data-row-id="${rowId}" data-is-father="${isFather}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">-- Chọn ${isFather ? 'Bố' : 'Mẹ'} --</option>
                        ${parentOptions}
                    </select>
                </div>
                <div style="flex: 1;">
                    <select class="sft-parent-relation-select" data-row-id="${rowId}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        ${isFather ? `
                            <option value="Cha ruột" ${selectedRelationType === 'Cha ruột' ? 'selected' : ''}>Cha ruột</option>
                            <option value="Cha nuôi" ${selectedRelationType === 'Cha nuôi' ? 'selected' : ''}>Cha nuôi</option>
                        ` : `
                            <option value="Mẹ ruột" ${selectedRelationType === 'Mẹ ruột' ? 'selected' : ''}>Mẹ ruột</option>
                            <option value="Mẹ nuôi" ${selectedRelationType === 'Mẹ nuôi' ? 'selected' : ''}>Mẹ nuôi</option>
                        `}
                    </select>
                </div>
                <button type="button" onclick="this.parentElement.remove()" style="padding: 8px 12px; background: #ffebee; color: #c62828; border: none; border-radius: 4px; cursor: pointer;">×</button>
            `;
            
            list.appendChild(row);
        };
        
        // Tính toán số lượng row hiện tại để tránh trùng ID
        const getNextRowId = (isFather, currentCount) => {
            const prefix = isFather ? 'sft-father-row-' : 'sft-mother-row-';
            return `${prefix}${currentCount}`;
        };
        
        // Thêm các cha hiện có
        let fatherRowIndex = 0;
        fathers.forEach((father) => {
            const rowId = getNextRowId(true, fatherRowIndex++);
            createParentRow(father.ParentId, father.LoaiQuanHe, true, rowId);
        });
        
        // Thêm các mẹ hiện có
        let motherRowIndex = 0;
        mothers.forEach((mother) => {
            const rowId = getNextRowId(false, motherRowIndex++);
            createParentRow(mother.ParentId, mother.LoaiQuanHe, false, rowId);
        });
        
        // Nếu chưa có cha/mẹ nào, thêm một row trống
        if (fathers.length === 0) {
            const rowId = getNextRowId(true, fatherRowIndex++);
            createParentRow(null, 'Cha ruột', true, rowId);
        }
        if (mothers.length === 0) {
            const rowId = getNextRowId(false, motherRowIndex++);
            createParentRow(null, 'Mẹ ruột', false, rowId);
        }
        
        // Event listeners cho nút "Thêm"
        // Sử dụng biến counter riêng để tránh trùng ID
        document.getElementById('sft-add-father-btn').onclick = () => {
            const rowId = getNextRowId(true, fatherRowIndex++);
            createParentRow(null, 'Cha ruột', true, rowId);
        };
        
        document.getElementById('sft-add-mother-btn').onclick = () => {
            const rowId = getNextRowId(false, motherRowIndex++);
            createParentRow(null, 'Mẹ ruột', false, rowId);
        };
        
        // Populate marital status
        const maritalStatusSelect = document.getElementById('sft-marital-status');
        const hasSpouse = node.pids && node.pids.length > 0;
        if (hasSpouse) {
            // Kiểm tra xem có ly hôn không (có thể mở rộng sau)
            maritalStatusSelect.value = 'married';
        } else {
            maritalStatusSelect.value = 'single';
        }
        
        // Populate spouse dropdown
        const spouseSelect = document.getElementById('sft-spouse');
        const spouseDiv = document.getElementById('sft-spouse-div');
        spouseSelect.innerHTML = '<option value="">-- Không chọn --</option>';
        
        // Populate spouse options (khác giới)
        const oppositeGender = node.gender === 'male' ? 'female' : 'male';
        this.nodes.filter(n => n.id !== node.id && n.gender === oppositeGender).forEach(n => {
            const option = document.createElement('option');
            option.value = n.id;
            option.textContent = n.name;
            if (hasSpouse && node.pids.includes(n.id)) {
                option.selected = true;
            }
            spouseSelect.appendChild(option);
        });
        
        // Show/hide spouse dropdown based on marital status
        if (maritalStatusSelect.value === 'married') {
            spouseDiv.style.display = 'block';
        } else {
            spouseDiv.style.display = 'none';
        }
        
        this.editFormOverlay.style.display = 'flex';
        
        // Event listener for marital status change
        maritalStatusSelect.onchange = () => {
            if (maritalStatusSelect.value === 'married') {
                spouseDiv.style.display = 'block';
            } else {
                spouseDiv.style.display = 'none';
                spouseSelect.value = '';
            }
        };
        
        // Event listener for gender change - update spouse dropdown
        const genderSelect = document.getElementById('sft-gender');
        genderSelect.onchange = () => {
            // Re-populate spouse dropdown based on new gender
            const newGender = genderSelect.value;
            const oppositeGender = newGender === 'male' ? 'female' : 'male';
            
            // Store current spouse selection
            const currentSpouseValue = spouseSelect.value;
            
            // Re-populate spouse options
            spouseSelect.innerHTML = '<option value="">-- Không chọn --</option>';
            this.nodes.filter(n => n.id !== node.id && n.gender === oppositeGender).forEach(n => {
                const option = document.createElement('option');
                option.value = n.id;
                option.textContent = n.name;
                // Try to keep current selection if still valid
                if (currentSpouseValue && currentSpouseValue == n.id && n.gender === oppositeGender) {
                    option.selected = true;
                }
                spouseSelect.appendChild(option);
            });
            
            // If current spouse is now invalid (same gender), clear selection
            if (currentSpouseValue) {
                const currentSpouse = this.nodes.find(n => n.id == currentSpouseValue);
                if (currentSpouse && currentSpouse.gender === newGender) {
                    spouseSelect.value = '';
                    // If marital status is married but no valid spouse, set to single
                    if (maritalStatusSelect.value === 'married') {
                        maritalStatusSelect.value = 'single';
                        spouseDiv.style.display = 'none';
                    }
                }
            }
        };
        
        // Event handlers
        document.getElementById('sft-cancel').onclick = () => {
            this.editFormOverlay.style.display = 'none';
        };
        
        document.getElementById('sft-save').onclick = () => {
            const maritalStatus = document.getElementById('sft-marital-status').value;
            const spouseValue = document.getElementById('sft-spouse').value;
            const newGender = document.getElementById('sft-gender').value;
            
            // Thu thập tất cả các cha và mẹ từ form
            // Mỗi row có một parent-select và một relation-select cùng data-row-id
            const allParentSelects = document.querySelectorAll('.sft-parent-select');
            const fathers = [];
            const mothers = [];
            
            allParentSelects.forEach((select) => {
                if (!select.value) return; // Bỏ qua nếu không chọn parent
                
                const rowId = select.getAttribute('data-row-id');
                const isFather = select.getAttribute('data-is-father') === 'true';
                
                // Tìm relation-select có cùng rowId trong cùng row
                const row = select.closest('div');
                let relationSelect = null;
                
                if (row) {
                    // Tìm relation-select trong cùng row
                    relationSelect = row.querySelector('.sft-parent-relation-select');
                }
                
                // Fallback: nếu không tìm thấy trong row, tìm theo data-row-id
                if (!relationSelect && rowId) {
                    const allRelationSelects = document.querySelectorAll('.sft-parent-relation-select');
                    relationSelect = Array.from(allRelationSelects).find(rs => rs.getAttribute('data-row-id') === rowId);
                }
                
                if (relationSelect && relationSelect.value) {
                    const parentData = {
                        id: parseInt(select.value),
                        relationType: relationSelect.value
                    };
                    
                    if (isFather) {
                        fathers.push(parentData);
                    } else {
                        mothers.push(parentData);
                    }
                }
            });
            
            // Validation: Kiểm tra spouse có hợp lệ không (khác giới)
            if (maritalStatus === 'married' && spouseValue) {
                const spouse = this.nodes.find(n => n.id == spouseValue);
                if (spouse && spouse.gender === newGender) {
                    if (typeof showToast !== 'undefined') {
                        showToast('Vợ/chồng phải khác giới! Vui lòng chọn lại.', 'warning');
                    } else {
                        alert('Vợ/chồng phải khác giới! Vui lòng chọn lại.');
                    }
                    return;
                }
            }
            
            const updatedNode = {
                ...node,
                name: document.getElementById('sft-name').value,
                gender: newGender,
                dob: document.getElementById('sft-dob').value,
                dod: document.getElementById('sft-dod').value,
                img: document.getElementById('sft-img').value,
                tieuSu: document.getElementById('sft-tieusu').value,
                maritalStatus: maritalStatus
            };
            
            // Update spouse relationship (pids)
            if (maritalStatus === 'married' && spouseValue) {
                // Double-check spouse is valid
                const spouse = this.nodes.find(n => n.id == spouseValue);
                if (spouse && spouse.gender !== newGender) {
                    updatedNode.pids = [parseInt(spouseValue)];
                    updatedNode.spouseId = parseInt(spouseValue);
                } else {
                    if (typeof showToast !== 'undefined') {
                        showToast('Vợ/chồng không hợp lệ! Vui lòng chọn lại.', 'warning');
                    } else {
                        alert('Vợ/chồng không hợp lệ! Vui lòng chọn lại.');
                    }
                    return;
                }
            } else {
                updatedNode.pids = [];
                delete updatedNode.spouseId;
            }
            
            // Update parent relationships (hỗ trợ nhiều cha mẹ)
            // Ưu tiên cha mẹ ruột cho cây gia phả (để hiển thị)
            const biologicalFather = fathers.find(f => f.relationType === 'Cha ruột');
            const biologicalMother = mothers.find(m => m.relationType === 'Mẹ ruột');
            
            if (biologicalFather) {
                updatedNode.fid = biologicalFather.id;
                updatedNode.relationTypeFather = 'Cha ruột';
            } else if (fathers.length > 0) {
                updatedNode.fid = fathers[0].id;
                updatedNode.relationTypeFather = fathers[0].relationType;
            } else {
                delete updatedNode.fid;
                delete updatedNode.relationTypeFather;
            }
            
            if (biologicalMother) {
                updatedNode.mid = biologicalMother.id;
                updatedNode.relationTypeMother = 'Mẹ ruột';
            } else if (mothers.length > 0) {
                updatedNode.mid = mothers[0].id;
                updatedNode.relationTypeMother = mothers[0].relationType;
            } else {
                delete updatedNode.mid;
                delete updatedNode.relationTypeMother;
            }
            
            // Lưu tất cả cha mẹ để gửi lên backend
            // QUAN TRỌNG: Luôn gửi allFathers và allMothers (có thể là mảng rỗng) để backend có thể xóa/quan hệ cũ
            updatedNode.allFathers = fathers.length > 0 ? fathers : [];
            updatedNode.allMothers = mothers.length > 0 ? mothers : [];
            
            // Debug: log để kiểm tra
            if (mothers.length > 0 || fathers.length > 0) {
            }
            
            this.updateNode(updatedNode);
            this.editFormOverlay.style.display = 'none';
        };
    }
    
    updateNode(updatedNode) {
        const index = this.nodes.findIndex(n => n.id === updatedNode.id);
        if (index !== -1) {
            this.nodes[index] = updatedNode;
            this.triggerEvent('update', {
                removeNodeId: null,
                updateNodesData: [updatedNode],
                addNodesData: []
            });
        }
    }
    
    async removeNode(node) {
        if (typeof showConfirm === 'function') {
            const confirmed = await showConfirm(`Bạn có chắc chắn muốn xóa "${node.name}"?`);
            if (confirmed) {
                this.triggerEvent('remove', node.id);
            }
        } else {
            // Fallback nếu showConfirm chưa load
            if (confirm(`Bạn có chắc chắn muốn xóa "${node.name}"?`)) {
                this.triggerEvent('remove', node.id);
            }
        }
    }
    
    fit() {
        if (this.nodes.length === 0) return;
        
        const padding = 50;
        const { nodeWidth, nodeHeight } = this.options;
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        this.nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            maxX = Math.max(maxX, node.x + nodeWidth);
            minY = Math.min(minY, node.y);
            maxY = Math.max(maxY, node.y + nodeHeight);
        });
        
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        
        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight;
        
        const scaleX = (containerWidth - padding * 2) / contentWidth;
        const scaleY = (containerHeight - padding * 2) / contentHeight;
        this.scale = Math.min(scaleX, scaleY, 1);
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        this.translateX = containerWidth / 2 - centerX * this.scale;
        this.translateY = containerHeight / 2 - centerY * this.scale;
        
        this.updateTransform();
    }
    
    on(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(handler);
        }
    }
    
    triggerEvent(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                handler(this, data);
            });
        }
    }
    
    destroy() {
        this.container.innerHTML = '';
        if (this.editFormOverlay) {
            this.editFormOverlay.remove();
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleFamilyTree;
}


